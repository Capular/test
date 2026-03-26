import type admin from "firebase-admin";
import { getTenantId } from "@/lib/tenant-context";

export function tenantUsersCollection(db: admin.firestore.Firestore) {
  return db.collection("tenants").doc(getTenantId()).collection("users");
}

export function tenantUserDoc(db: admin.firestore.Firestore, uid: string) {
  return tenantUsersCollection(db).doc(uid);
}

export async function readTenantUserWithFallback(
  db: admin.firestore.Firestore,
  uid: string
) {
  const scopedRef = tenantUserDoc(db, uid);
  const scopedSnap = await scopedRef.get();
  if (scopedSnap.exists) {
    return { source: "tenant" as const, snapshot: scopedSnap };
  }

  const legacyRef = db.collection("users").doc(uid);
  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists) {
    return { source: "none" as const, snapshot: scopedSnap };
  }

  await scopedRef.set(
    {
      ...legacySnap.data(),
      migration: {
        source: "legacy_users",
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  const migratedSnap = await scopedRef.get();
  return { source: "legacy" as const, snapshot: migratedSnap };
}
