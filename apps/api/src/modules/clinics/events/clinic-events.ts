export class ClinicCreatedEvent {
  constructor(public readonly tenantId: string, public readonly clinicId: string) {}
}
