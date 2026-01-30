import { MoodReaderPlayer } from './player';
import { PlayerBridge } from './bridge';
import { Logger } from '../common/logger';

Logger.log('MoodReader Player Tab Starting...');

const player = new MoodReaderPlayer('player');
new PlayerBridge(player);
