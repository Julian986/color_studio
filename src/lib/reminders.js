export function sendReminder(appointment) {
  const nombre = appointment?.nombre ?? appointment?.name ?? "";
  const fecha = appointment?.fecha ?? appointment?.date ?? "";
  const hora = appointment?.hora ?? appointment?.time ?? "";

  if (!nombre || !fecha || !hora) {
    throw new Error("appointment debe incluir nombre, fecha y hora");
  }

  return `Hola ${nombre}! Te recordamos tu turno en Colorstudio Moscardini el ${fecha} a las ${hora}. Responde SI para confirmar.`;
}
