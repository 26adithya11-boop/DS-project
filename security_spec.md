# Firestore Security Rules Specification

## Data Invariants
1. `users/{userId}`: A user profile document may only be created and accessed by its authenticated owner (`request.auth.uid == userId`). Users cannot modify fields of other users.
2. `triage_records/{recordId}`: A triage record must be linked to the creating clinician (`userId == request.auth.uid`). Users can only query their own triage records.
3. Timestamps, strings, and numeric bounds must be strictly enforced.

## The Dirty Dozen Payloads
1. **Unauthenticated Read to User Profile**: `GET /users/victim-uid` without auth -> PERMISSION_DENIED.
2. **Cross-User Profile Write**: Authenticated user `attacker` tries to `SET /users/victim` -> PERMISSION_DENIED.
3. **Ghost Field Injection in User Profile**: Adding unauthorized `isAdmin: true` -> PERMISSION_DENIED.
4. **Oversized String in Triage Record**: `patientName` exceeding 128 characters -> PERMISSION_DENIED.
5. **Negative Urgency Score**: `urgencyScore: -5.0` (must be 1.0 to 5.0) -> PERMISSION_DENIED.
6. **Invalid ESI Level**: `esiLevel: 9` (must be 1 through 5) -> PERMISSION_DENIED.
7. **Identity Spoofing in Triage Record**: Creating record with `userId: "other-user"` -> PERMISSION_DENIED.
8. **Malicious Path ID Injection**: Document ID containing illegal traversal characters -> PERMISSION_DENIED.
9. **Blanket Query Scraping**: Client attempts query on `/triage_records` without `where('userId', '==', request.auth.uid)` -> PERMISSION_DENIED.
10. **Cross-User Triage Update**: Modifying another clinician's triage record -> PERMISSION_DENIED.
11. **Cross-User Triage Deletion**: Deleting another clinician's triage record -> PERMISSION_DENIED.
12. **Malformed Types**: Passing boolean for `heartRate` -> PERMISSION_DENIED.
