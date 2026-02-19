export enum AppraisalStatus {
  NOWA = 1,
  W_TRAKCIE_WERYFIKACJI = 2,
  ZWERYFIKOWANA = 3,
  SKORYGOWANA = 4,
  OCZEKUJE_NA_DECYZJE = 5,
  ZAAKCEPTOWANA = 6,
  ODRZUCONA = 7,
  UMOWA_W_PRZYGOTOWANIU = 8,
  UMOWA_PODPISANA = 9,
  REALIZACJA_FINANSOWA = 10,
  ZAKONCZONA = 11,
  PRZEKAZANA_DO_CENTRALI = 12,
  ZWROT_DO_KLIENTA = 13
}

export enum UserRole {
  OPERATOR = 'operator',
  SENIOR_OPERATOR = 'senior_operator',
  ADMIN = 'admin'
}

export enum ContractType {
  UMOWA_KUPNA = 'umowa_kupna',
  FAKTURA_VAT = 'faktura_vat'
}

export enum ContractSubtype {
  PHYSICAL_PERSON = 'physical_person',
  PHYSICAL_PERSON_VAT = 'physical_person_vat',
  BUSINESS = 'business'
}

export enum ContractStatus {
  GENERATED = 'generated',
  SENT = 'sent',
  SIGNED = 'signed',
  RETURNED = 'returned'
}

export enum MessageType {
  EMAIL_SENT = 'email_sent',
  EMAIL_RECEIVED = 'email_received',
  SMS_SENT = 'sms_sent',
  SMS_RECEIVED = 'sms_received',
  SYSTEM = 'system'
}

export enum ShipmentType {
  INCOMING_COURIER = 'incoming_courier',
  INCOMING_SALON = 'incoming_salon',
  RETURN_COURIER = 'return_courier',
  RETURN_INPOST = 'return_inpost'
}

export enum ShipmentStatus {
  ORDERED = 'ordered',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  RETURNED = 'returned'
}

export enum PaymentMethod {
  TRANSFER = 'transfer',
  CASH = 'cash',
  GIFT_CARD = 'gift_card'
}
