/** Color Studio: sin reglas extra por servicio (cierre por día en salon-availability). */

export function filterPublicSlotsByTreatmentRules(
  _treatmentId: string | undefined,
  slots: string[],
  _dateKey?: string,
): string[] {
  return slots;
}
