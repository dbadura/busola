import { getBusolaClusterParams } from './busola-cluster-params';
import { getActiveCluster } from './cluster-management/cluster-management';

const resolvers = {
  //leave the structure for the future when we add new options
  apiGroup: (selector, data) =>
    data?.apiGroups.find(g => g.includes(selector.apiGroup)),
};

async function resolveSelector(selector, data) {
  if (!resolvers[selector.type]) {
    throw Error('Unkown selector type ' + selector.type);
  } else {
    return await resolvers[selector.type](selector, data);
  }
}

export async function resolveFeatureAvailability(feature, data) {
  try {
    if (!feature || feature.isEnabled === false) {
      return false;
    }
    for (const selector of feature.selectors || []) {
      if (!(await resolveSelector(selector, data))) {
        return false;
      }
    }
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

async function resolveFeatures(features, data) {
  const entries = await Promise.all(
    Object.entries(features).map(async ([name, feature]) => [
      name,
      {
        ...feature,
        isEnabled: await resolveFeatureAvailability(feature, data),
      },
    ]),
  );
  return Object.fromEntries(entries);
}

export async function getFeatures(data = null) {
  const rawFeatures =
    (await getActiveCluster())?.features ||
    (await getBusolaClusterParams())?.config?.features;

  return await resolveFeatures(rawFeatures || {}, data);
}
