export enum Collection {
  BOOKING_PRODUCTS = 'ftts_bookingproducts',
}

export enum OriginType {
  CANDIDATE = 'Candidate',
  TRAINER_BOOKER = 'Trainer Booker',
}

export enum BookingStatus {
  RESERVED = 675030000,
  CONFIRMED = 675030001,
  CANCELLATION_IN_PROGRESS = 675030002,
  CHANGE_IN_PROGRESS = 675030003,
  COMPLETE_PASSED = 675030004,
  COMPLETE_FAILED = 675030005,
  DRAFT = 675030006,
  CANCELLED = 675030008,
  UNASSIGNED = 675030009,
  EXPIRED = 675030010,
  ASSIGNED = 675030011,
}

export enum GovernmentAgency {
  DVSA = 0,
  DVA = 1,
}

export enum Origin {
  CITIZEN_PORTAL = 1,
  CUSTOMER_SERVICES_CENTRE = 2,
  IHTTC_PORTAL = 3,
  TRAINER_BOOKER_PORTAL = 4,
}

export enum ProductNumber {
  CAR = '1001',
  MOTORCYCLE = '2001',
  LGVMC = '3001',
  LGVHPT = '3002',
  LGVCPC = '3003',
  LGVCPCC = '3004',
  PCVMC = '4001',
  PCVHPT = '4002',
  PCVCPC = '4003',
  PCVCPCC = '4004',
  ADIP1 = '5001',
  ADIHPT = '5002',
  ADIP1DVA = '5003',
  ERS = '6001',
  AMIP1 = '7001',
  TAXI = '8001',
}

export enum FinanceTransactionType {
  BOOKING = 675030004,
}

export enum FinanceTransactionStatus {
  DEFERRED = 675030000,
  RECOGNISED = 675030001,
  DUPLICATE = 675030002,
}

export enum TriggerAction {
  CANCEL_WITH_OWED_COMPENSATION_CHANGE = 'CANCEL_WITH_OWED_COMPENSATION_CHANGE',
}

export enum CancelReason {
  DVSA_CANCELLED = 675030007,
  TEST_CENTRE_CANCELLED = 675030008,
  TEST_ENGINE_CANCELLED = 675030009,
  BEREAVEMENT = 675030000,
  EMERGENCY = 675030001,
  EXAMS = 675030002,
  MEDICAL = 675030003,
  NO_LONGER_A_SUITABLE_DATATIME = 675030004,
  PREFER_NOT_TO_SAY = 675030005,
  OTHER = 675030006,
}

export enum BookingCategory {
  STANDARD_BOOKING_CANCELLATION = 'standard-booking-cancellation',
  STANDARD_CANDIDATE_BOOKING_CANCELLATION = 'standard-candidate-booking-cancellation',
  STANDARD_TRAINER_BOOKER_BOOKING_CANCELLATION = 'standard-trainer-booker-booking-cancellation',
}

export enum Channel {
  email = 'email',
  letter = 'letter',
}
