import i18next from 'i18next';
import { translate } from '../../../src/helpers/language';
import { Target } from '../../../src/services/notification/types/enums';

jest.mock('i18next', () => ({
  changeLanguage: jest.fn(),
  init: jest.fn(),
  t: jest.fn((str): string => str as string),
}));

describe('language', () => {
  test('i18next is called in GB context', async () => {
    const result = await translate('test', Target.GB);

    expect(i18next.changeLanguage).toHaveBeenCalledWith('en');
    expect(i18next.t).toHaveBeenCalledWith('test');
    expect(result).toStrictEqual('test');
  });

  test('i18next is called in NI context', async () => {
    const result = await translate('test', Target.NI);

    expect(i18next.changeLanguage).toHaveBeenCalledWith('ni');
    expect(i18next.t).toHaveBeenCalledWith('test');
    expect(result).toStrictEqual('test');
  });
});
