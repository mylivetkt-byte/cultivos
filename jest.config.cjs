module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  modulePathIgnorePatterns: ['<rootDir>/backup_2026-07-02_09-32-57', '<rootDir>/mobile'],
  testMatch: ['**/__tests__/**/*.test.jsx', '**/__tests__/**/*.test.js']
};
