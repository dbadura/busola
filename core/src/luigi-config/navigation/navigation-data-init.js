import i18next from 'i18next';
import {
  fetchPermissions,
  fetchBusolaInitData,
  fetchNamespaces,
  fetchObservabilityHost,
} from './queries';
import { getBusolaClusterParams } from '../busola-cluster-params';
import { config } from '../config';
import {
  coreUIViewGroupName,
  getStaticChildrenNodesForNamespace,
  getStaticRootNodes,
} from './static-navigation-model';
import { navigationPermissionChecker, hasAnyRoleBound } from './permissions';
import { getFeatures, resolveFeatureAvailability } from '../features';
import { showAlert } from '../utils/showAlert';

import {
  hideDisabledNodes,
  createNamespacesList,
  addExternalNodes,
} from './navigation-helpers';
import { clearAuthData, getAuthData } from '../auth/auth-storage';
import { groups } from '../auth/auth';
import {
  getActiveCluster,
  getClusters,
  getActiveClusterName,
  setCluster,
  deleteActiveCluster,
  saveActiveClusterName,
  getCurrentContextNamespace,
  saveCARequired,
} from '../cluster-management/cluster-management';
import { getFeatureToggle } from '../utils/feature-toggles';
import { saveLocation } from './previous-location';
import { NODE_PARAM_PREFIX } from '../luigi-config';
import { loadTargetClusterConfig } from '../utils/target-cluster-config';
import { checkClusterStorageType } from '../cluster-management/clusters-storage';
import { getSSOAuthData } from '../auth/sso';
import { setNavFooterText } from '../nav-footer';

async function createAppSwitcher() {
  const activeClusterName = getActiveClusterName();

  const clusterNodes = Object.entries(await getClusters()).map(
    ([clusterName, { currentContext }]) => ({
      title: clusterName,
      subTitle: currentContext.cluster.server,
      link:
        activeClusterName === clusterName
          ? `/cluster/${encodeURIComponent(clusterName)}`
          : `/set-cluster/${encodeURIComponent(clusterName)}`,
    }),
  );

  const clusterOverviewNode = {
    title: i18next.t('clusters.overview.title-all-clusters'),
    link: '/clusters',
    testId: 'clusters-overview',
  };

  return { items: [...clusterNodes, clusterOverviewNode] };
}

export async function reloadNavigation() {
  const navigation = await createNavigation();
  Luigi.setConfig({ ...Luigi.getConfig(), navigation });

  // wait for Luigi to update DOM
  setTimeout(async () => {
    await setNavFooterText();
  }, 100);
}

async function createClusterManagementNodes(features) {
  const activeClusterName = getActiveClusterName();

  const childrenNodes = [
    {
      hideSideNav: true,
      pathSegment: 'remove',
      async onNodeActivation() {
        await deleteActiveCluster();
        return false;
      },
    },
    {
      pathSegment: 'preferences',
      viewUrl: config.coreUIModuleUrl + '/preferences',
      openNodeInModal: { title: i18next.t('preferences.title'), size: 'm' },
    },
  ];

  if (!features.ADD_CLUSTER_DISABLED?.isEnabled) {
    const addClusterNode = [
      {
        hideSideNav: true,
        pathSegment: 'add',
        navigationContext: 'clusters',
        viewUrl: config.coreUIModuleUrl + '/clusters/add',
      },
    ];
    childrenNodes.push(addClusterNode);
  }

  const clusterManagementNode = {
    pathSegment: 'clusters',
    hideFromNav: true,
    hideSideNav: true,
    viewUrl: config.coreUIModuleUrl + '/clusters',
    viewGroup: coreUIViewGroupName,
    children: childrenNodes,
    context: {
      clusters: await getClusters(),
      activeClusterName,
      language: i18next.language,
      busolaClusterParams: await getBusolaClusterParams(),
      features,
      ssoData: getSSOAuthData(),
    },
  };

  const notActiveCluster = name => name !== activeClusterName;

  const clusterNodes = Object.keys(await getClusters())
    .filter(notActiveCluster)
    .map(clusterName => ({
      pathSegment: encodeURIComponent(clusterName),
      hideFromNav: true,
      onNodeActivation: async () => {
        await setCluster(clusterName);
        return false;
      },
    }));

  const clusterNode = {
    pathSegment: 'set-cluster',
    hideFromNav: true,
    children: clusterNodes,
  };

  const noPermissionsNode = {
    pathSegment: 'no-permissions',
    hideFromNav: true,
    hideSideNav: true,
    viewUrl: config.coreUIModuleUrl + '/no-permissions',
  };

  return [clusterManagementNode, clusterNode, noPermissionsNode];
}

async function createNavigationForNoCluster() {
  const features = await getFeatures();

  return {
    profile: {
      items: [
        {
          icon: 'settings',
          label: i18next.t('top-nav.profile.preferences'),
          link: '/clusters/preferences',
          openNodeInModal: {
            title: i18next.t('preferences.title'),
            size: 'm',
          },
        },
      ],
    },
    preloadViewGroups: false,
    appSwitcher: await createAppSwitcher(),
    nodes: await createClusterManagementNodes(features),
  };
}

export async function createNavigation() {
  try {
    const authData = getAuthData();
    if (!(await getActiveCluster()) || !authData) {
      return await createNavigationForNoCluster();
    }

    await saveCARequired();
    await loadTargetClusterConfig();

    const activeCluster = await getActiveCluster();

    await checkClusterStorageType(activeCluster.config.storage);

    // we assume all users can make SelfSubjectRulesReview request
    const permissionSet = await fetchPermissions(
      authData,
      getCurrentContextNamespace(activeCluster.kubeconfig),
    );

    const apiGroups = await fetchBusolaInitData(authData);

    const activeClusterName = activeCluster.currentContext.cluster.name;

    const features = await getFeatures({
      authData,
      apiGroups,
      permissionSet,
    });

    const optionsForCurrentCluster = {
      contextSwitcher: {
        defaultLabel: 'Select Namespace ...',
        parentNodePath: `/cluster/${encodeURIComponent(
          activeClusterName,
        )}/namespaces`, // absolute path
        lazyloadOptions: true, // load options on click instead on page load
        options: getNamespaces,
      },
      profile: {
        items: [
          {
            icon: 'settings',
            label: i18next.t('top-nav.profile.preferences'),
            link: `/cluster/${encodeURIComponent(
              activeClusterName,
            )}/preferences`,
            openNodeInModal: {
              title: i18next.t('preferences.title'),
              size: 'm',
            },
          },
        ],
      },
    };
    const isNodeEnabled = node => {
      if (node.context?.requiredFeatures) {
        for (const feature of node.context.requiredFeatures || []) {
          if (!feature || feature.isEnabled === false) return false;
        }
      }
      return true;
    };

    if (!hasAnyRoleBound(permissionSet)) {
      const error = i18next.t('common.errors.no-permissions-no-role');
      saveLocation(`/no-permissions?${NODE_PARAM_PREFIX}error=${error}`);
    }

    return {
      preloadViewGroups: false,
      nodeAccessibilityResolver: node =>
        isNodeEnabled(node) && navigationPermissionChecker(node, permissionSet),
      appSwitcher: await createAppSwitcher(),
      ...optionsForCurrentCluster,
      nodes: await createNavigationNodes(features, apiGroups, permissionSet),
    };
  } catch (err) {
    saveActiveClusterName(null);
    if (err.statusCode === 403) {
      clearAuthData();
      saveLocation(
        `/no-permissions?${NODE_PARAM_PREFIX}error=${err.originalMessage}`,
      );
    } else {
      let errorNotification = 'Could not load initial configuration';
      if (err.statusCode && err.message)
        errorNotification += `: ${err.message} (${err.statusCode}${
          err.originalMessage && err.message !== err.originalMessage
            ? ':' + err.originalMessage
            : ''
        })`;
      showAlert({
        text: errorNotification,
        type: 'error',
      });
      console.warn(err);
    }
    return await createNavigationForNoCluster();
  }
}

async function getObservabilityNodes(authData, enabledFeatures) {
  let links =
    // take the Config Params at first
    (await resolveFeatureAvailability(enabledFeatures.OBSERVABILITY)) &&
    enabledFeatures.OBSERVABILITY?.config.links;

  if (!links) {
    const defaultObservability = (await getBusolaClusterParams()).config
      .features.OBSERVABILITY;
    links =
      (await resolveFeatureAvailability(defaultObservability)) && //  use the Busola configMap as a fallback
      defaultObservability.config.links;
  }
  if (!links) return []; // could not get the OBSERVABILITY feature config from either source, do not add any nodes

  const CATEGORY = {
    label: 'Observability',
    icon: 'stethoscope',
    collapsible: true,
  };
  const navNodes = await Promise.all(
    links.map(async ({ label, path }) => {
      try {
        return {
          category: CATEGORY,
          externalLink: {
            url: 'https://' + (await fetchObservabilityHost(authData, path)),
            sameWindow: false,
          },
          label,
        };
      } catch (e) {
        return undefined;
      }
    }),
  );
  return navNodes.filter(n => n);
}

export async function createNavigationNodes(
  features,
  apiGroups,
  permissionSet,
) {
  const authData = getAuthData();
  const activeCluster = await getActiveCluster();

  if (!activeCluster || !getAuthData()) {
    return await createClusterManagementNodes(features);
  }

  const activeClusterName = encodeURIComponent(
    activeCluster.currentContext.cluster.name,
  );
  const { navigation = {}, hiddenNamespaces = [] } =
    activeCluster?.config || {};

  const clusterChildren = async () => {
    const staticNodes = getStaticRootNodes(
      getChildrenNodesForNamespace,
      apiGroups,
      permissionSet,
      features,
    );
    const observabilitySection = await getObservabilityNodes(
      authData,
      features,
    );
    const externalNodes = addExternalNodes(navigation.externalNodes);
    const allNodes = [
      ...staticNodes,
      ...observabilitySection,
      ...externalNodes,
    ];
    hideDisabledNodes(navigation.disabledNodes, allNodes, false);
    return allNodes;
  };

  const nodes = [
    {
      pathSegment: 'cluster',
      hideFromNav: true,
      onNodeActivation: () => {
        Luigi.navigation().navigate(`/cluster/${activeClusterName}`);
      },
      children: [
        {
          navigationContext: 'cluster',
          pathSegment: activeClusterName,
          children: clusterChildren,
        },
      ],
      context: {
        authData,
        groups,
        features,
        hiddenNamespaces,
        cluster: activeCluster.currentContext.cluster,
        config: activeCluster.config,
        kubeconfig: activeCluster.kubeconfig,
        language: i18next.language,
        ssoData: getSSOAuthData(),
      },
    },
  ];
  return [...nodes, ...(await createClusterManagementNodes(features))];
}

async function getNamespaces() {
  const { hiddenNamespaces = [] } = (await getActiveCluster()).config;
  try {
    let namespaces = await fetchNamespaces(getAuthData());
    if (!getFeatureToggle('showHiddenNamespaces')) {
      namespaces = namespaces.filter(ns => !hiddenNamespaces.includes(ns.name));
    }
    return createNamespacesList(namespaces);
  } catch (e) {
    showAlert({
      text: `Cannot fetch namespaces: ${e.message}`,
      type: 'error',
    });
    return [];
  }
}

async function getChildrenNodesForNamespace(
  apiGroups,
  permissionSet,
  features,
) {
  const { navigation = {} } = (await getActiveCluster()).config;
  const staticNodes = getStaticChildrenNodesForNamespace(
    apiGroups,
    permissionSet,
    features,
  );

  hideDisabledNodes(navigation.disabledNodes, staticNodes, true);
  return staticNodes;
}
