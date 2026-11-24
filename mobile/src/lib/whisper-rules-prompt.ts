import { Alert } from 'react-native';
import { supabase } from '../api/supabase';
import { WHISPER_RULES } from './whisper-rules';

export function showWhisperRules() {
  Alert.alert('Regole di Whisper', WHISPER_RULES, [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Accetto', onPress: async () => {
      try {
        const { error } = await supabase.rpc('accept_whisper_rules_v1');
        if (error) throw error;
        Alert.alert('Regole accettate', 'Il testo è ancora nella conversazione. Tocca Invia quando vuoi.');
      } catch {
        Alert.alert('Accettazione non riuscita', 'Riprova prima di inviare il sussurro.');
      }
    } },
  ]);
}
