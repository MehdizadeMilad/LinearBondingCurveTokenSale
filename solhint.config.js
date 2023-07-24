
const rules = [
  'no-unused-vars',
  'const-name-snakecase',
  'contract-name-camelcase',
  'event-name-camelcase',
  'imports-on-top',
  'no-global-import',
];

module.exports = {
  plugins: [],
  rules: Object.fromEntries(rules.map(r => [r, 'error'])),
};
