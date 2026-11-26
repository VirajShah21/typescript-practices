import { createRequire } from 'node:module'
import type { ESLint } from 'eslint'
import { defineConfig } from 'eslint/config'

// Use native CommonJS loading so FlatCompat and this config share
// plugin identities.
const requirePlugin = createRequire(__filename)
const { FlatCompat }: typeof import('@eslint/eslintrc') =
    requirePlugin('@eslint/eslintrc')
const typescript: typeof import('@typescript-eslint/eslint-plugin') =
    requirePlugin('@typescript-eslint/eslint-plugin')
const typescriptParser: typeof import('@typescript-eslint/parser') =
    requirePlugin('@typescript-eslint/parser')
// These plugin versions do not ship TypeScript declarations.
const eslintComments: ESLint.Plugin = requirePlugin(
    'eslint-plugin-eslint-comments'
)
const prettier: ESLint.Plugin = requirePlugin('eslint-plugin-prettier')
const reactPerf: ESLint.Plugin = requirePlugin('eslint-plugin-react-perf')
const importPlugin: typeof import('eslint-plugin-import') = requirePlugin(
    'eslint-plugin-import'
)
const jsdoc: typeof import('eslint-plugin-jsdoc').default = requirePlugin(
    'eslint-plugin-jsdoc'
)
const react: typeof import('eslint-plugin-react') = requirePlugin(
    'eslint-plugin-react'
)
const reactHooks: typeof import('eslint-plugin-react-hooks') = requirePlugin(
    'eslint-plugin-react-hooks'
)

// The installed Next.js preset still uses the legacy shared-config format.
const compat = new FlatCompat({
    baseDirectory: __dirname,
    resolvePluginsRelativeTo: __dirname,
})

export = defineConfig([
    {
        ignores: [
            '**/.*',
            '!**/.eslintrc.*',
            '**/.next',
            '**/dist',
            '**/node_modules',
            'apps/edx-mgmt/src/mira-pro/components/guards',
            'apps/edx-mgmt/src/mira-pro/components/navbar',
            'apps/edx-mgmt/src/mira-pro/components/pages',
            'apps/edx-mgmt/src/mira-pro/components/sidebar',
            'apps/edx-mgmt/src/mira-pro/contexts',
            'apps/edx-mgmt/src/mira-pro/hooks',
            'apps/edx-mgmt/src/mira-pro/layouts',
            'apps/edx-mgmt/src/mira-pro/mocks',
            'apps/edx-mgmt/src/mira-pro/redux',
            'apps/edx-mgmt/src/mira-pro/theme',
            'apps/edx-mgmt/src/mira-pro/types',
            'apps/edx-mgmt/src/mira-pro/utils',
            'apps/edx-mgmt/src/mira-pro/vendor',
            'src/mira-pro/components/guards',
            'src/mira-pro/components/navbar',
            'src/mira-pro/components/pages',
            'src/mira-pro/components/sidebar',
            'src/mira-pro/contexts',
            'src/mira-pro/hooks',
            'src/mira-pro/layouts',
            'src/mira-pro/mocks',
            'src/mira-pro/redux',
            'src/mira-pro/theme',
            'src/mira-pro/types',
            'src/mira-pro/utils',
            'src/mira-pro/vendor',
        ],
    },
    {
        files: ['**/*.{cjs,cts,js,jsx,mjs,ts,tsx}'],
        extends: compat.extends(
            'next',
            'next/core-web-vitals',
            'prettier',
            'plugin:@typescript-eslint/recommended',
            'plugin:eslint-comments/recommended'
        ),
        languageOptions: {
            // Preserve the legacy defaults. TypeScript parsing still
            // supports modern syntax.
            ecmaVersion: 5,
            parser: typescriptParser,
            parserOptions: {
                ecmaFeatures: {
                    globalReturn: false,
                },
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: 'off',
        },
        plugins: {
            // The plugin's legacy config types allow null parsers;
            // ESLint's types do not.
            '@typescript-eslint': typescript as unknown as ESLint.Plugin,
            'eslint-comments': eslintComments,
            import: importPlugin,
            jsdoc,
            prettier,
            react,
            'react-hooks': reactHooks,
            'react-perf': reactPerf,
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            complexity: ['warn', 20],
            'max-len': ['error', 80],
            'max-lines': [
                'error',
                { max: 300, skipBlankLines: true, skipComments: true },
            ],
            'prettier/prettier': 'error',
            '@next/next/link-passhref': 'off',
            '@next/next/no-html-link-for-pages': 'off',
            'react/no-unescaped-entities': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            'react-hooks/exhaustive-deps': 'error',
            curly: ['error', 'multi'],
            'no-restricted-imports': [
                'error',
                { patterns: ['../*', '@mui/icons-material*'] },
            ],
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: {
                        ancestorsOnly: true,
                        esm: true,
                        cjs: true,
                        window: true,
                    },
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                    },
                    contexts: [
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        'TSEnumDeclaration',
                    ],
                },
            ],
            'jsdoc/require-hyphen-before-param-description': [
                'error',
                'always',
                {
                    tags: {
                        param: 'always',
                        returns: 'never',
                        property: 'always',
                    },
                },
            ],
            'jsdoc/require-throws': 'error',
            'jsdoc/require-description': 'error',
            'jsdoc/require-description-complete-sentence': 'error',
            'jsdoc/check-indentation': 'error',
            'jsdoc/sort-tags': 'error',
            'jsdoc/check-access': 'error',
            'jsdoc/check-alignment': 'error',
            'jsdoc/check-param-names': ['error', { checkDestructured: false }],
            'jsdoc/check-property-names': 'error',
            'jsdoc/check-tag-names': 'error',
            'jsdoc/check-types': 'error',
            'jsdoc/check-values': 'error',
            'jsdoc/empty-tags': 'error',
            'jsdoc/implements-on-classes': 'error',
            'jsdoc/multiline-blocks': 'error',
            'jsdoc/no-multi-asterisks': 'error',
            'jsdoc/no-undefined-types': 'error',
            'jsdoc/require-param': ['error', { checkDestructuredRoots: false }],
            'jsdoc/require-param-description': 'error',
            'jsdoc/require-param-name': 'error',
            'jsdoc/require-property': 'error',
            'jsdoc/require-property-description': 'error',
            'jsdoc/require-property-name': 'error',
            'jsdoc/require-returns': 'error',
            'jsdoc/require-returns-check': 'error',
            'jsdoc/require-returns-description': 'error',
            'jsdoc/require-yields': 'error',
            'jsdoc/require-yields-check': 'error',
            'jsdoc/tag-lines': 'error',
            'jsdoc/valid-types': 'error',
            'jsdoc/no-types': 'error',
            'jsdoc/require-template': 'error',
            'import/exports-last': 'off',
            'import/no-absolute-path': 'error',
            'react/jsx-no-bind': 'error',
            'react/no-multi-comp': ['error', { ignoreStateless: true }],
            'eslint-comments/no-use': 'error',
        },
    },
    {
        files: ['apps/edx-mgmtlsp/**/*.js'],
        rules: {
            '@next/next/no-html-link-for-pages': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'jsdoc/require-jsdoc': 'off',
        },
    },
    {
        files: ['packages/**/*.{ts,cjs}'],
        rules: {
            '@next/next/no-html-link-for-pages': 'off',
        },
    },
    {
        files: ['apps/*/test/**/*.cjs', 'packages/*/test/**/*.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'jsdoc/require-jsdoc': 'off',
        },
    },
])
