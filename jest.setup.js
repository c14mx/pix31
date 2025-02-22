const { jest } = require('@jest/globals');

jest.setTimeout(10000);

jest.mock('chalk', () => ({
  cyan: (text) => `cyan(${text})`,
  yellow: (text) => `yellow(${text})`,
  red: (text) => `red(${text})`,
  green: (text) => `green(${text})`
})); 
