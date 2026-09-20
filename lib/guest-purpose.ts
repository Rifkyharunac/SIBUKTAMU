type PurposeService = { name: string; category?: string; requiresPurpose?: boolean };
export function isOtherService(service?: PurposeService) {
  return Boolean(service && (service.category === "Lainnya" || /^Lainnya(?:\s|$)/i.test(service.name)));
}
export function needsPurpose(service?: PurposeService) {
  return isOtherService(service) || Boolean(service?.requiresPurpose);
}
export function visitPurpose(service: PurposeService | undefined, text: string) {
  return text.trim() || (isOtherService(service) ? "" : service?.name ?? "");
}
