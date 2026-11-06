import { Input, Label } from '@ui5/webcomponents-react';
import { useTranslation } from 'react-i18next';

export default function AttachSettings() {
  const { t } = useTranslation();

  return (
    <>
      <div className="settings-row">
        <Label for="attach-default-command" className="bsl-has-color-status-4">
          {t('settings.terminal.default-command')}
        </Label>
        <Input
          id="attach-default-command"
          accessibleName={t('settings.terminal.default-command')}
        />
      </div>
      <div className="settings-row">
        <Label for="attach-default-image" className="bsl-has-color-status-4">
          {t('settings.terminal.default-image')}
        </Label>
        <Input
          id="attach-default-image"
          accessibleName={t('settings.terminal.default-image')}
        />
      </div>
    </>
  );
}
