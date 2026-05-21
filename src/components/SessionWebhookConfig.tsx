import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionWebhookConfigProps {
  sessionId: string;
  sessionName: string;
  initialUrl?: string;
  initialEnabled?: boolean;
  initialEvents?: string[];
  onUpdate?: () => void;
}

const AVAILABLE_EVENTS = [
  { id: 'MESSAGES_UPSERT', labelKey: 'webhooks.eventTypes.MESSAGES_UPSERT' },
  { id: 'MESSAGES_UPDATE', labelKey: 'webhooks.eventTypes.MESSAGES_UPDATE' },
  { id: 'CONNECTION_UPDATE', labelKey: 'webhooks.eventTypes.CONNECTION_UPDATE' },
];

export function SessionWebhookConfig({
  sessionId,
  sessionName,
  initialUrl = '',
  initialEnabled = false,
  initialEvents = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
  onUpdate
}: SessionWebhookConfigProps) {
  const { t } = useTranslation();
  const [webhookUrl, setWebhookUrl] = useState(initialUrl);
  const [webhookEnabled, setWebhookEnabled] = useState(initialEnabled);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(initialEvents);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is ok if disabled
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (webhookEnabled && !webhookUrl) {
      toast.error(t('webhooks.urlRequired'));
      return;
    }

    if (webhookUrl && !validateUrl(webhookUrl)) {
      toast.error(t('webhooks.httpsRequired'));
      return;
    }

    if (webhookEnabled && selectedEvents.length === 0) {
      toast.error(t('webhooks.eventsRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://kfsvpbujmetlendgwnrs.supabase.co/functions/v1/update-session-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            webhook_url: webhookUrl || null,
            webhook_enabled: webhookEnabled,
            webhook_events: selectedEvents
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success(t('webhooks.saveSuccess'));
        onUpdate?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error saving webhook config:', error);
      toast.error(error.message || t('webhooks.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl || !validateUrl(webhookUrl)) {
      toast.error(t('webhooks.httpsRequired'));
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Send a test payload to the user's webhook URL
      const testPayload = {
        event: 'TEST',
        instance: sessionName,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from Hook7',
          test: true
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'TEST',
          'X-Session-Id': sessionId,
          'X-Instance-Name': sessionName
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        setTestResult('success');
        toast.success(t('webhooks.testSuccess'));
      } else {
        setTestResult('error');
        toast.error(`${t('webhooks.testError')}: HTTP ${response.status}`);
      }
    } catch (error: any) {
      setTestResult('error');
      toast.error(`${t('webhooks.testError')}: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Webhook className="h-5 w-5 text-primary" />
          {t('webhooks.title')}
        </CardTitle>
        <CardDescription>{t('webhooks.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="webhook-enabled" className="text-sm font-medium">
            {t('webhooks.enabled')}
          </Label>
          <Switch
            id="webhook-enabled"
            checked={webhookEnabled}
            onCheckedChange={setWebhookEnabled}
          />
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url" className="text-sm font-medium">
            {t('webhooks.url')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              type="url"
              placeholder={t('webhooks.urlPlaceholder')}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={!validateUrl(webhookUrl) && webhookUrl ? 'border-destructive' : ''}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleTest}
              disabled={isTesting || !webhookUrl || !validateUrl(webhookUrl)}
              title={t('webhooks.testWebhook')}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult === 'success' ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : testResult === 'error' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {webhookUrl && !validateUrl(webhookUrl) && (
            <p className="text-xs text-destructive">{t('webhooks.httpsRequired')}</p>
          )}
        </div>

        {/* Event Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('webhooks.events')}</Label>
          <p className="text-xs text-muted-foreground">{t('webhooks.eventsDescription')}</p>
          <div className="grid grid-cols-1 gap-3">
            {AVAILABLE_EVENTS.map((event) => (
              <div key={event.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`event-${event.id}`}
                  checked={selectedEvents.includes(event.id)}
                  onCheckedChange={() => handleEventToggle(event.id)}
                />
                <Label
                  htmlFor={`event-${event.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {t(event.labelKey)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('common.save')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
