const tsJestPresets = require('ts-jest/presets')

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  transform: {
    '\\.(gql|graphql)$': 'jest-transform-graphql',
    ...tsJestPresets.jsWithBabel.transform
  },
  modulePaths: ['<rootDir>/packages/'],
  moduleNameMapper: {
    '~/(.*)': ['<rootDir>/../client/$1']
  },
  testRegex: '/__tests__/.*.test\\.[jt]sx?$'
}
