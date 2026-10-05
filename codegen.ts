import { type CodegenConfig } from '@graphql-codegen/cli';

// 스키마는 BE 스냅샷(schema/schema.graphql), 문서는 src 안 graphql() 호출(app/은 문서를 두지 않는다). 산출물은 커밋하고 CI가 신선도를 검사한다.
const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema/schema.graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/graphql/generated/**', '!src/**/*.spec.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    'src/graphql/generated/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        scalars: { DateTime: 'string' },
        enumsAsTypes: true,
        useTypeImports: true,
        documentMode: 'string',
      },
    },
  },
};

export default config;
