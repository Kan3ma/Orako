import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface NjukaSettings {
  less: boolean;
  bunx: boolean;
  ponch: boolean;
  tenJackConsecutive: boolean;
}

interface Props {
  settings: NjukaSettings;
  onChange?: (settings: NjukaSettings) => void;
  showPonch?: boolean;
  isHost?: boolean;
  endCondition?: 'first_winner' | 'last_two';
  onEndConditionChange?: (condition: 'first_winner' | 'last_two') => void;
  changesApplyNextRound?: boolean;
}

export const GameSettingsDialog = ({ settings, onChange, showPonch = false, isHost = true, endCondition, onEndConditionChange, changesApplyNextRound = false }: Props) => {
  const editable = isHost && !!onChange;
  const rows: Array<{ key: keyof NjukaSettings; title: string; description: string }> = [
    ...(showPonch ? [{ key: 'ponch' as const, title: 'Ponch', description: 'Before the opening fourth card, participating players exchange one selected card through a shuffled pool.' }] : []),
    { key: 'less', title: 'Less', description: 'Optionally discard one complete consecutive pair from two consecutive pairs, then draw one replacement.' },
    { key: 'bunx', title: 'Bunx', description: 'Optionally discard one complete matching pair from two matching pairs, then draw one replacement.' },
    { key: 'tenJackConsecutive', title: '10 and J are consecutive', description: 'Regional rule: connect the A–10 sequence to J–Q–K by allowing 10 and Jack to form a consecutive pair.' },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline" className="border-gold/50 bg-secondary/90 text-gold hover:bg-gold hover:text-background"><Settings className="mr-2 h-4 w-4" />Settings</Button></DialogTrigger>
      <DialogContent className="border-border bg-secondary text-foreground sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-2xl text-gold">Game settings</DialogTitle><DialogDescription>{editable ? 'Choose the optional rules for this match.' : 'Only the room host can change these rules.'}</DialogDescription></DialogHeader>
        {changesApplyNextRound && editable && <p className="rounded-md border border-gold/30 bg-gold/10 p-2 text-sm text-gold">Changes made now will apply to the next round.</p>}
        <div className="space-y-3">
          {rows.map(row => <label key={row.key} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3"><input type="checkbox" checked={settings[row.key]} disabled={!editable} onChange={event => onChange?.({ ...settings, [row.key]: event.target.checked })} className="mt-1 accent-yellow-400"/><span><strong className="text-gold">{row.title}</strong><span className="block text-sm text-foreground/70">{row.description}</span></span></label>)}
          {endCondition && <label className="block rounded-lg border border-border bg-background/40 p-3"><strong className="text-gold">When the game ends</strong><select disabled={!isHost} value={endCondition} onChange={event => onEndConditionChange?.(event.target.value as 'first_winner' | 'last_two')} className="mt-2 w-full rounded border border-border bg-secondary p-2 text-foreground"><option value="first_winner">After the first winner</option><option value="last_two">When only two active players remain</option></select></label>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
