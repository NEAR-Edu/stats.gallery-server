module.exports = {
  '*': 'prettier --write',
  '**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
};