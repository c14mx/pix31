import { jest } from '@jest/globals';
import { browse } from './command';
import { PIXELARTICONS_URL } from './lib/constants';

jest.mock('open', () => {
  return jest.fn().mockImplementation(() => Promise.resolve());
});

import open from 'open';

describe('browse', () => {
  it('Opens pixelarticons website', async () => {
    await browse();
    expect(open).toHaveBeenCalledWith(PIXELARTICONS_URL);
  });
}); 