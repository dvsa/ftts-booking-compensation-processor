import { EmailType, LetterType, Target } from '../types/enums';

import gbTrainerBookerBookingCancellationEmail from './email/trainerbooker-booking-cancellation/gb';
import gbBookingCancellationEmail from './email/candidate-booking-cancellation/gb';
import niBookingCancellationEmail from './email/candidate-booking-cancellation/ni';

import gbBookingCancellationLetter from './letter/candidate-booking-cancellation/gb';
import niBookingCancellationLetter from './letter/candidate-booking-cancellation/ni';

export const content = {
  email: {
    [EmailType.CANDIDATE_BOOKING_CANCELLATION]: {
      [Target.GB]: gbBookingCancellationEmail,
      [Target.NI]: niBookingCancellationEmail,
    },
    [EmailType.TRAINER_BOOKER_BOOKING_CANCELLATION]: {
      [Target.GB]: gbTrainerBookerBookingCancellationEmail,
    },
  },
  letter: {
    [LetterType.BOOKING_CANCELLATION]: {
      [Target.GB]: gbBookingCancellationLetter,
      [Target.NI]: niBookingCancellationLetter,
    },
  },
};
