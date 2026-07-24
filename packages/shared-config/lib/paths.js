const path = require('path');

const PKG_ROOT = path.join(__dirname, '..');

module.exports = {
    PKG_ROOT,
    eslintConfig: path.join(PKG_ROOT, 'eslint.config.js'),
    prettierConfig: path.join(PKG_ROOT, 'prettier.config.js'),
    lintStagedConfig: path.join(PKG_ROOT, 'lint-staged.config.js'),
};
