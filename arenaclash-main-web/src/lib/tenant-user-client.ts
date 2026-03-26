import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { legacyUserPath, tenantUserPath } from "@/lib/tenant-context";

export function tenantUserRef(db: Firestore, uid: string) {
  return doc(db, ...tenantUserPath(uid));
}

export function legacyUserRef(db: Firestore, uid: string) {
  return doc(db, ...legacyUserPath(uid));
}

export async function readTenantUserWithFallback(db: Firestore, uid: string) {
  const scopedRef = tenantUserRef(db, uid);
  const scopedSnap = await getDoc(scopedRef);
  if (scopedSnap.exists()) {
    return { source: "tenant" as const, snapshot: scopedSnap };
  }

  const legacyRef = legacyUserRef(db, uid);
  const legacySnap = await getDoc(legacyRef);
  if (!legacySnap.exists()) {
    return { source: "none" as const, snapshot: scopedSnap };
  }

  const legacyData = legacySnap.data();
  await setDoc(
    scopedRef,
    {
      ...legacyData,
      migration: {
        source: "legacy_users",
        migratedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );

  const migrated = await getDoc(scopedRef);
  return { source: "legacy" as const, snapshot: migrated };
}

export async function upsertTenantUser(
  db: Firestore,
  uid: string,
  payload: DocumentData
) {
  await setDoc(tenantUserRef(db, uid), payload, { merge: true });
}
