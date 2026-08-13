import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';

const config = [
  ...(Array.isArray(next) ? next : [next]),
  ...(Array.isArray(ts) ? ts : [ts]),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'processed/**',
      'source/**',
      'public/media/**',
      'scripts/colab_pipeline.py',
    ],
  },
];

export default config;
