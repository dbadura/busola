import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from 'shared/ResourceForm/ResourceForm';

export const HostsForm = ({ server = {}, servers, setServers }) => {
  const { t } = useTranslation();

  const setValue = hosts => {
    server.hosts = hosts;
    setServers([...servers]);
  };

  return (
    <ResourceForm.TextArrayInput
      advanced
      required
      tooltipContent={t('gateways.create-modal.tooltips.hosts')}
      value={server.hosts || []}
      setValue={setValue}
      title={t('gateways.create-modal.advanced.hosts')}
      inputProps={{
        placeholder: t('gateways.create-modal.advanced.placeholders.hosts'),
      }}
      defaultOpen
    />
  );
};
