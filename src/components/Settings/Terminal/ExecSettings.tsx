import { Input, Label } from '@ui5/webcomponents-react';
import { useTranslation } from 'react-i18next';

export default function ExecSettings() {
  const { t } = useTranslation();

  return (
    <div className="settings-row">
      <Label for="exec-default-command" className="bsl-has-color-status-4">
        {t('settings.terminal.default-command')}
      </Label>
      <Input
        id="exec-default-command"
        accessibleName={t('settings.terminal.default-command')}
      />
    </div>
  );
}
