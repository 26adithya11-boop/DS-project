import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ClinicalMove {
  id: string;
  actionType: 'DISCHARGE_BED' | 'TRANSFER_ICU' | 'TRANSFER_OR' | 'ADMIT_TO_BED';
  title: string;
  patientId?: number;
  patientName?: string;
  bedId?: string;
  bedName?: string;
  reasoning: string;
  expectedImpact: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecommendationResponse {
  assessment: string;
  congestionStatus: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
  recommendedMoves: ClinicalMove[];
  generatedBy: 'GEMINI_AI' | 'CLINICAL_HEURISTIC_FALLBACK';
}

// Fallback algorithm that computes optimal moves if AI call fails or key is missing
function generateAlgorithmicMoves(queue: any[], beds: any[], metrics: any): RecommendationResponse {
  const moves: ClinicalMove[] = [];
  const occupiedBeds = beds.filter((b: any) => b.patient !== null);
  const emptyBeds = beds.filter((b: any) => b.patient === null);
  const stabilizedBeds = beds.filter(
    (b: any) => b.patient !== null && b.treatmentElapsedSeconds >= b.treatmentTotalDuration
  );

  // 1. Check for stabilized beds that should be discharged to release capacity
  stabilizedBeds.forEach((bed: any, idx: number) => {
    moves.push({
      id: `move-disch-${bed.id}-${idx}`,
      actionType: 'DISCHARGE_BED',
      title: `Discharge #${bed.patient.id} (${bed.patient.name}) from ${bed.name}`,
      patientId: bed.patient.id,
      patientName: bed.patient.name,
      bedId: bed.id,
      bedName: bed.name,
      reasoning: `Patient has completed the full ${bed.treatmentTotalDuration}s clinical care protocol. Discharging frees critical trauma capacity.`,
      expectedImpact: 'Frees 1 bed immediately for highest-priority Min-Heap patient.',
      priority: 'HIGH',
    });
  });

  // 2. Check for deteriorating patients in ER that need ICU escalation
  const criticalInEr = beds.filter(
    (b: any) =>
      b.department === 'ER' &&
      b.patient !== null &&
      (b.patient.calculatedUrgency <= 1.8 || b.patient.esiLevel === 1) &&
      b.treatmentElapsedSeconds >= 8
  );

  criticalInEr.slice(0, 1).forEach((bed: any, idx: number) => {
    moves.push({
      id: `move-icu-${bed.id}-${idx}`,
      actionType: 'TRANSFER_ICU',
      title: `Escalate #${bed.patient.id} (${bed.patient.name}) to Intensive Care Unit (ICU)`,
      patientId: bed.patient.id,
      patientName: bed.patient.name,
      bedId: bed.id,
      bedName: bed.name,
      reasoning: `Patient presents extreme clinical instability (ESI-${bed.patient.esiLevel}, Urgency: ${bed.patient.calculatedUrgency.toFixed(2)}). Transferring to ICU secures critical life support and vacates the resuscitation bay.`,
      expectedImpact: 'Secures 1:1 ICU monitoring and relieves frontline ER bay.',
      priority: 'HIGH',
    });
  });

  // 3. Check for waiting patients in the Min-Heap priority queue that can be admitted
  const openErBeds = emptyBeds.filter((b: any) => b.department === 'ER');
  const openOrBeds = emptyBeds.filter((b: any) => b.department === 'OR');

  // Next root patient
  if (queue.length > 0) {
    const rootPatient = queue[0];
    const targetBed =
      rootPatient.department === 'OR'
        ? openOrBeds[0] || emptyBeds[0]
        : openErBeds[0] || emptyBeds[0];

    if (targetBed) {
      moves.push({
        id: `move-admit-root-${rootPatient.id}`,
        actionType: 'ADMIT_TO_BED',
        title: `Admit Root Patient #${rootPatient.id} (${rootPatient.name}) -> ${targetBed.name}`,
        patientId: rootPatient.id,
        patientName: rootPatient.name,
        bedId: targetBed.id,
        bedName: targetBed.name,
        reasoning: `Root element of Min-Heap holds highest urgency score (${rootPatient.calculatedUrgency.toFixed(3)}, ESI-${rootPatient.esiLevel}) for ${rootPatient.chiefComplaint}. Admitting now prevents queue mortality.`,
        expectedImpact: `Halts wait time accumulation and starts immediate medical care.`,
        priority: 'HIGH',
      });
    }

    // Second patient if multiple beds available
    if (queue.length > 1 && emptyBeds.length > 1) {
      const secondPatient = queue[1];
      const secondBed = emptyBeds.find((b: any) => b.id !== targetBed?.id);
      if (secondBed) {
        moves.push({
          id: `move-admit-sec-${secondPatient.id}`,
          actionType: 'ADMIT_TO_BED',
          title: `Admit Patient #${secondPatient.id} (${secondPatient.name}) -> ${secondBed.name}`,
          patientId: secondPatient.id,
          patientName: secondPatient.name,
          bedId: secondBed.id,
          bedName: secondBed.name,
          reasoning: `High priority case (${secondPatient.chiefComplaint}, ESI-${secondPatient.esiLevel}) matching available capacity.`,
          expectedImpact: 'Accelerates queue throughput by parallel admission.',
          priority: 'MEDIUM',
        });
      }
    }
  }

  const occupancyPct = beds.length > 0 ? (occupiedBeds.length / beds.length) * 100 : 0;
  const congestionStatus =
    occupancyPct >= 85 || queue.length >= 6
      ? 'CRITICAL'
      : occupancyPct >= 65 || queue.length >= 3
      ? 'ELEVATED'
      : 'NOMINAL';

  const assessment =
    moves.length > 0
      ? `Hospital beds are at ${Math.round(occupancyPct)}% capacity with ${queue.length} patients waiting in the Min-Heap priority queue. Executing these ${moves.length} clinical moves will optimize bed turnover and ensure zero delay for critical cases.`
      : `Flow is currently balanced with all urgent cases actively attended to. Continue monitoring vital signs and telemetry sweeps.`;

  return {
    assessment,
    congestionStatus,
    recommendedMoves: moves,
    generatedBy: 'CLINICAL_HEURISTIC_FALLBACK',
  };
}

// AI recommendations route
app.post('/api/recommendations', async (req, res) => {
  const { queue = [], beds = [], metrics = {} } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment, using algorithmic recommendation engine.');
      return res.json(generateAlgorithmicMoves(queue, beds, metrics));
    }

    const queueDigest = queue.slice(0, 8).map((p: any, idx: number) => ({
      heapIndex: idx,
      id: p.id,
      name: p.name,
      age: p.age,
      dept: p.department,
      complaint: p.chiefComplaint,
      urgency: p.calculatedUrgency,
      esi: p.esiLevel,
      waitSec: p.waitTimeSeconds,
      vitals: { hr: p.vitals?.heartRate, bp: `${p.vitals?.systolicBp}/${p.vitals?.diastolicBp}`, spo2: p.vitals?.oxygenSat }
    }));

    const bedDigest = beds.map((b: any) => ({
      id: b.id,
      name: b.name,
      dept: b.department,
      isOccupied: b.patient !== null,
      patientId: b.patient?.id,
      patientName: b.patient?.name,
      patientEsi: b.patient?.esiLevel,
      elapsedSec: b.treatmentElapsedSeconds,
      totalDurationSec: b.treatmentTotalDuration,
      isStabilized: b.patient !== null && b.treatmentElapsedSeconds >= b.treatmentTotalDuration
    }));

    const prompt = `Analyze this real-time hospital emergency department & operating room status:
QUEUE (Min-Heap Priority Queue, index 0 is Root / highest urgency):
${JSON.stringify(queueDigest, null, 2)}

BEDS (ER Bays & OR Suites):
${JSON.stringify(bedDigest, null, 2)}

METRICS:
${JSON.stringify(metrics, null, 2)}

Provide clinical operations recommendations to relieve bottlenecks, discharge stabilized patients, transfer critical patients to ICU, or admit high-priority root patients into empty beds.

Respond ONLY with valid JSON conforming strictly to:
{
  "assessment": "Brief clinical evaluation of queue delay, bed saturation, and flow bottlenecks",
  "congestionStatus": "CRITICAL" | "ELEVATED" | "NOMINAL",
  "recommendedMoves": [
    {
      "id": "unique-id-1",
      "actionType": "DISCHARGE_BED" | "TRANSFER_ICU" | "TRANSFER_OR" | "ADMIT_TO_BED",
      "title": "Clear concise move summary",
      "patientId": 123,
      "patientName": "Patient Name",
      "bedId": "bed-id",
      "bedName": "Bed Name",
      "reasoning": "Clear clinical justification based on vitals, duration, and urgency",
      "expectedImpact": "Quantifiable impact on queue wait time and capacity",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.recommendedMoves && Array.isArray(parsed.recommendedMoves)) {
          return res.json({
            assessment: parsed.assessment || 'Clinical moves compiled successfully.',
            congestionStatus: parsed.congestionStatus || 'NOMINAL',
            recommendedMoves: parsed.recommendedMoves,
            generatedBy: 'GEMINI_AI',
          });
        }
      } catch (jsonErr) {
        console.error('Failed to parse Gemini response JSON:', jsonErr, responseText);
      }
    }

    // Fallback if model returned unexpected format
    return res.json(generateAlgorithmicMoves(queue, beds, metrics));
  } catch (err: any) {
    console.error('Gemini API call failed, falling back to algorithmic recommendation engine:', err?.message || err);
    return res.json(generateAlgorithmicMoves(queue, beds, metrics));
  }
});

// Mount Vite or serve static assets
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
