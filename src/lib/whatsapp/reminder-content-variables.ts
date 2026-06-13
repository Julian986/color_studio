/**
 * Variables para la plantilla Twilio de Color Studio:
 * {{1}} nombre · {{2}} fecha · {{3}} hora
 */
export function buildReminderContentVariables(input: {
  nombre: string;
  fecha: string;
  hora: string;
}): { contentVariablesJson: string; templateVariables: Record<string, string> } {
  return {
    contentVariablesJson: JSON.stringify({
      "1": input.nombre,
      "2": input.fecha,
      "3": input.hora,
    }),
    templateVariables: {
      nombre: input.nombre,
      fecha: input.fecha,
      hora: input.hora,
    },
  };
}
