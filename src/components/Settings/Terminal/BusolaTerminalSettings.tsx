import { Button, Input, Label } from '@ui5/webcomponents-react';
import { useTranslation } from 'react-i18next';

export default function BusolaTerminalSettings() {
  const { t } = useTranslation();

  return (
    <>
      <div className="settings-row">
        <Label
          for="busola-terminal-default-command"
          className="bsl-has-color-status-4"
        >
          {t('settings.terminal.default-command')}
        </Label>
        <Input
          id="busola-terminal-default-command"
          accessibleName={t('settings.terminal.default-command')}
        />
      </div>
      <div className="settings-row">
        <Label
          for="busola-terminal-default-image"
          className="bsl-has-color-status-4"
        >
          {t('settings.terminal.default-image')}
        </Label>
        <Input
          id="busola-terminal-default-image"
          accessibleName={t('settings.terminal.default-image')}
        />
      </div>
      <div className="settings-row">
        <Label
          for="busola-terminal-inactivity-timeout"
          className="bsl-has-color-status-4"
        >
          {t('settings.terminal.inactivity-timeout')}
        </Label>
        <Input
          id="busola-terminal-inactivity-timeout"
          accessibleName={t('settings.terminal.inactivity-timeout')}
        />
      </div>
      <div className="settings-row">
        <Label className="bsl-has-color-status-4">
          {t('settings.terminal.restore-defaults')}
        </Label>
        <div>
          <Button design="Default" onClick={() => {}}>
            {t('settings.terminal.restore-defaults-button')}
          </Button>
        </div>
      </div>
    </>
  );
}
