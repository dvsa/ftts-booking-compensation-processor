import i18next from 'i18next';
import { Target } from '../services/notification/types/enums';
import gb from '../locales/gb/translation.json';
import ni from '../locales/ni/translation.json';

export const translate = async (key: string, target: Target): Promise<string> => {
  await i18next.init({
    resources: {
      en: gb,
      ni,
    },
  });
  await i18next.changeLanguage(target === Target.NI ? 'ni' : 'en');
  return i18next.t(key);
};
