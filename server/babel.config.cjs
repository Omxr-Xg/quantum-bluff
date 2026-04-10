module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ],
  // Jest exécute le JS transformé en contexte CJS : sans ça, `import.meta` reste
  // dans le bundle et provoque « Cannot use import.meta outside a module » (CI).
  plugins: ['babel-plugin-transform-import-meta'],
};
