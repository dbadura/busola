import { getResourceDefs } from 'shared/helpers/getResourceDefs';

export const getSecretDefs = (t, context) =>
  getResourceDefs('secrets', t, context);

export const mapObjectValues = (fn, obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, fn(value)]),
  );

export function createSecretTemplate(namespaceId) {
  return {
    type: 'Opaque',
    metadata: {
      name: '',
      namespace: namespaceId,
      labels: {},
      annotations: {},
    },
    data: {},
  };
}

export function createPresets(secretDefs, namespaceId, t) {
  return [
    {
      name: t('secrets.create-modal.presets.default'),
      value: createSecretTemplate(namespaceId),
    },
    ...secretDefs.map(({ title, name, type, data, ...value }) => ({
      name: title || name || type,
      value: {
        ...createSecretTemplate(namespaceId),
        ...value,
        name,
        type,
        data: data?.reduce((acc, key) => ({ ...acc, [key]: '' }), {}),
      },
    })),
  ];
}
