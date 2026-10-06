/**
 * Genuine C99 Engine Source Code for Hospital ER/OR Triage Min-Heap
 * Fully compilable via: gcc -O3 triage_engine.c -o triage_engine
 */

export const C_HEADER_SOURCE = `/*
 * ==============================================================================
 * TRIAGE_ENGINE.H - Hospital ER & OR Priority Queue Engine (ANSI C99)
 * High-performance Binary Min-Heap implementation for Real-time Triage.
 * ==============================================================================
 */

#ifndef TRIAGE_ENGINE_H
#define TRIAGE_ENGINE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#define MAX_HEAP_CAPACITY 256
#define MAX_NAME_LEN      48
#define MAX_COMPLAINT_LEN 96

/* Binary Heap Navigation Macros: Zero-Indexed Continuous Array */
#define HEAP_PARENT(i) (((i) - 1) >> 1)
#define HEAP_LEFT(i)   (((i) << 1) + 1)
#define HEAP_RIGHT(i)  (((i) << 1) + 2)

typedef enum {
    DEPT_ER = 0, /* Emergency Department / Trauma Bays */
    DEPT_OR = 1  /* Operating Room / Immediate Surgical Intervention */
} Department;

typedef enum {
    ESI_1_RESUSCITATION = 1, /* Immediate life-saving intervention needed */
    ESI_2_EMERGENT      = 2, /* High risk, confused/lethargic, severe pain */
    ESI_3_URGENT        = 3, /* Multiple resources required, stable vitals */
    ESI_4_SEMI_URGENT   = 4, /* One resource required (e.g., simple sutures) */
    ESI_5_NON_URGENT    = 5  /* No resources needed (med refill, minor rash) */
} EsiTriageLevel;

/* Contiguous struct representing real clinical vital signs */
typedef struct {
    int16_t heart_rate;       /* bpm (Normal: 60 - 100) */
    int16_t systolic_bp;      /* mmHg (Normal: 90 - 120) */
    int16_t diastolic_bp;     /* mmHg (Normal: 60 - 80) */
    int16_t spo2_percent;     /* % Oxygen Saturation (Normal: 95 - 100) */
    int16_t resp_rate;        /* Breaths/min (Normal: 12 - 20) */
    float   temperature_c;    /* Celsius (Normal: 36.5 - 37.5) */
    int8_t  gcs_score;        /* Glasgow Coma Scale (3 - 15) */
    int8_t  pain_level;       /* 0 (No pain) to 10 (Worst pain) */
    int8_t  injury_severity;  /* ISS Trauma Scale (1 to 75) */
    uint8_t _padding;         /* 32-bit boundary alignment */
} Vitals;

/* Continuous patient record in C memory (128 bytes aligned) */
typedef struct {
    uint32_t       id;
    char           name[MAX_NAME_LEN];
    int8_t         age;
    char           gender;    /* 'M', 'F', 'O' */
    uint8_t        dept;      /* Department enum */
    uint8_t        esi_level; /* EsiTriageLevel */
    char           complaint[MAX_COMPLAINT_LEN];
    Vitals         vitals;
    float          calculated_urgency; /* Min-Heap Key: 1.000 (Highest) to 5.000 */
    uint64_t       arrival_epoch_sec;
    uint32_t       wait_seconds;
} Patient;

/* Binary Min-Heap Priority Queue */
typedef struct {
    Patient  data[MAX_HEAP_CAPACITY];
    int      size;
    uint64_t total_insertions;
    uint64_t total_extractions;
    uint64_t total_swaps;
} PriorityQueue;

/* Core Engine Function Declarations */
void           pq_init(PriorityQueue *pq);
float          triage_calculate_urgency(const Vitals *v, Department dept);
EsiTriageLevel triage_map_esi_level(float urgency);
bool           pq_insert(PriorityQueue *pq, const Patient *patient, int *out_swaps);
bool           pq_extract_min(PriorityQueue *pq, Patient *out_patient, int *out_swaps);
const Patient* pq_peek(const PriorityQueue *pq);
bool           pq_update_vitals(PriorityQueue *pq, uint32_t patient_id, const Vitals *new_vitals);
void           pq_min_heapify(PriorityQueue *pq, int index, int *out_swaps);
void           pq_bubble_up(PriorityQueue *pq, int index, int *out_swaps);

#endif /* TRIAGE_ENGINE_H */
`;

export const C_IMPLEMENTATION_SOURCE = `/*
 * ==============================================================================
 * TRIAGE_ENGINE.C - High-Performance Hospital Priority Queue Implementation
 * ANSI C99 / Portable Embedded & WebAssembly Compliant
 * ==============================================================================
 */

#include "triage_engine.h"
#include <string.h>
#include <math.h>
#include <stdio.h>

void pq_init(PriorityQueue *pq) {
    if (!pq) return;
    pq->size = 0;
    pq->total_insertions = 0;
    pq->total_extractions = 0;
    pq->total_swaps = 0;
    memset(pq->data, 0, sizeof(pq->data));
}

/*
 * Calculate composite urgency score based on clinical deviations from homeostasis.
 * 1.000 = Immediate / Imminent arrest (highest priority in Min-Heap)
 * 5.000 = Routine / Non-urgent
 */
float triage_calculate_urgency(const Vitals *v, Department dept) {
    if (!v) return 5.0f;
    float score = 5.0f;

    /* 1. Hemodynamic collapse: Systolic Blood Pressure */
    if (v->systolic_bp < 80)       score -= 2.2f;
    else if (v->systolic_bp < 90)  score -= 1.4f;
    else if (v->systolic_bp > 210) score -= 1.1f;

    /* 2. Hypoxia: SpO2 Oxygen Saturation */
    if (v->spo2_percent < 85)      score -= 2.4f;
    else if (v->spo2_percent < 90) score -= 1.6f;
    else if (v->spo2_percent < 93) score -= 0.8f;

    /* 3. Severe Tachycardia / Bradycardia */
    if (v->heart_rate > 150 || v->heart_rate < 40)      score -= 1.8f;
    else if (v->heart_rate > 125 || v->heart_rate < 50) score -= 1.0f;

    /* 4. Respiratory Distress */
    if (v->resp_rate > 36 || v->resp_rate < 8)  score -= 1.5f;
    else if (v->resp_rate > 26)                  score -= 0.7f;

    /* 5. Neurological Deficit (Glasgow Coma Scale) */
    if (v->gcs_score <= 8)       score -= 2.2f;
    else if (v->gcs_score <= 12) score -= 1.1f;

    /* 6. Major Anatomical Trauma (Injury Severity Score) */
    if (v->injury_severity >= 25)      score -= 2.0f;
    else if (v->injury_severity >= 15) score -= 1.2f;
    else if (v->injury_severity >= 9)  score -= 0.6f;

    /* 7. Surgical Urgency Modifier */
    if (dept == DEPT_OR) {
        score -= 0.45f;
    }

    /* Clamp score between 1.000 (Critical) and 5.000 (Non-urgent) */
    if (score < 1.000f) score = 1.000f;
    if (score > 5.000f) score = 5.000f;
    return score;
}

EsiTriageLevel triage_map_esi_level(float urgency) {
    if (urgency <= 1.80f) return ESI_1_RESUSCITATION;
    if (urgency <= 2.80f) return ESI_2_EMERGENT;
    if (urgency <= 3.80f) return ESI_3_URGENT;
    if (urgency <= 4.40f) return ESI_4_SEMI_URGENT;
    return ESI_5_NON_URGENT;
}

/* O(log N) - Bubble up patient to restore Min-Heap invariant */
void pq_bubble_up(PriorityQueue *pq, int index, int *out_swaps) {
    int i = index;
    int swaps = 0;

    while (i > 0) {
        int parent = HEAP_PARENT(i);

        /* Min-heap condition: parent urgency must be <= child urgency */
        if (pq->data[parent].calculated_urgency <= pq->data[i].calculated_urgency) {
            break;
        }

        /* Swap 128-byte patient struct in continuous memory */
        Patient temp = pq->data[i];
        pq->data[i] = pq->data[parent];
        pq->data[parent] = temp;

        swaps++;
        i = parent;
    }

    pq->total_swaps += swaps;
    if (out_swaps) *out_swaps = swaps;
}

/* O(log N) - Min-heapify downwards from index */
void pq_min_heapify(PriorityQueue *pq, int i, int *out_swaps) {
    int smallest = i;
    int left = HEAP_LEFT(i);
    int right = HEAP_RIGHT(i);
    int total_s = 0;

    if (left < pq->size && 
        pq->data[left].calculated_urgency < pq->data[smallest].calculated_urgency) {
        smallest = left;
    }

    if (right < pq->size && 
        pq->data[right].calculated_urgency < pq->data[smallest].calculated_urgency) {
        smallest = right;
    }

    if (smallest != i) {
        Patient temp = pq->data[i];
        pq->data[i] = pq->data[smallest];
        pq->data[smallest] = temp;
        total_s++;

        int sub_swaps = 0;
        pq_min_heapify(pq, smallest, &sub_swaps);
        total_s += sub_swaps;
    }

    pq->total_swaps += total_s;
    if (out_swaps) *out_swaps = total_s;
}

/* O(log N) - Insert patient into Min-Heap */
bool pq_insert(PriorityQueue *pq, const Patient *patient, int *out_swaps) {
    if (!pq || !patient || pq->size >= MAX_HEAP_CAPACITY) {
        return false;
    }

    /* Place at the next available leaf index */
    int index = pq->size;
    pq->data[index] = *patient;
    pq->size++;
    pq->total_insertions++;

    /* Bubble up to restore heap invariant */
    pq_bubble_up(pq, index, out_swaps);
    return true;
}

/* O(log N) - Extract highest priority patient (root of Min-Heap) */
bool pq_extract_min(PriorityQueue *pq, Patient *out_patient, int *out_swaps) {
    if (!pq || pq->size <= 0) {
        return false;
    }

    if (out_patient) {
        *out_patient = pq->data[0];
    }

    pq->total_extractions++;

    if (pq->size == 1) {
        pq->size = 0;
        if (out_swaps) *out_swaps = 0;
        return true;
    }

    /* Move leaf element to root and heapify down */
    pq->data[0] = pq->data[pq->size - 1];
    pq->size--;

    pq_min_heapify(pq, 0, out_swaps);
    return true;
}

const Patient* pq_peek(const PriorityQueue *pq) {
    if (!pq || pq->size == 0) return NULL;
    return &pq->data[0];
}

/* O(N + log N) - Dynamic decrease-key when patient vitals deteriorate */
bool pq_update_vitals(PriorityQueue *pq, uint32_t patient_id, const Vitals *new_vitals) {
    if (!pq || !new_vitals) return false;

    for (int i = 0; i < pq->size; i++) {
        if (pq->data[i].id == patient_id) {
            pq->data[i].vitals = *new_vitals;
            float new_score = triage_calculate_urgency(new_vitals, (Department)pq->data[i].dept);
            float old_score = pq->data[i].calculated_urgency;
            pq->data[i].calculated_urgency = new_score;
            pq->data[i].esi_level = triage_map_esi_level(new_score);

            int swaps = 0;
            if (new_score < old_score) {
                pq_bubble_up(pq, i, &swaps);
            } else {
                pq_min_heapify(pq, i, &swaps);
            }
            return true;
        }
    }
    return false;
}
`;
