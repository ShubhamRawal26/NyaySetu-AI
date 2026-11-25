/**
 * @fileoverview Devanagari digit map and multilingual (Hindi, English, Romanized Hinglish)
 * natural-language keyword dictionary mapped to BNS 2023 statutory record IDs.
 */

/**
 * Maps Devanagari digits (०-९) to standard ASCII digits (0-9).
 */
export const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

/**
 * Multilingual synonym lexicon (Devanagari Hindi, English, and Romanized Hinglish)
 * keyed by `StatutorySectionRecord.id`.
 */
export const HINDI_EXTRA_KEYWORDS: Record<string, string[]> = {
  'bns-115-2': [
    'मारपीट', 'झगड़ा', 'कहासुनी', 'पड़ोसी', 'थप्पड़', 'साधारण चोट', 'हमला', 'पीटा', 'मारा',
    'attack', 'attacked', 'attacking', 'assault', 'assaulted', 'beat', 'beaten', 'beating',
    'hit', 'hitting', 'punch', 'punched', 'slapped', 'kick', 'kicked', 'violence',
    'physical fight', 'scuffle', 'brawl', 'maara', 'mara', 'peeta', 'pita', 'maar peet',
    'marpit', 'maarpit', 'thappad', 'ghusa', 'mukka', 'laath', 'hamla', 'humla', 'chot',
    'ladai', 'laddai', 'larai', 'padosi', 'parosi', 'haath uthaya', 'hathapai',
  ],
  'bns-352': [
    'गाली', 'अपमान', 'अभद्र', 'बदतमीजी', 'insulted', 'humiliate', 'humiliated', 'cuss',
    'swearing', 'vulgar', 'gaali', 'gali galoch', 'gaali galoj', 'beizzati', 'badtameezi', 'apshabd',
  ],
  'bns-351-2': [
    'धमकी', 'धमकाना', 'जान से मारने की धमकी', 'डराना', 'threatened', 'threatening',
    'blackmail', 'blackmailing', 'extort', 'intimidate', 'dhamkana', 'dhamkiya', 'dhamkiyan',
    'jaan se maarne', 'jan se marne', 'darana', 'dara raha',
  ],
  'bns-303-2': [
    'चोरी', 'साइकिल', 'मोबाइल चोरी', 'चोर', 'पर्स चोरी', 'steal', 'stealing', 'stole',
    'robbed', 'robbery', 'pickpocket', 'snatch', 'snatched', 'snatching', 'shoplifting',
    'wallet', 'purse', 'laptop', 'chori ho gaya', 'chori kar liya', 'chura liya', 'churaya',
    'chor', 'gayab kar diya', 'mobile chori', 'phone chori', 'paisa chori',
  ],
  'bns-305': [
    'घर में चोरी', 'मकान में चोरी', 'दुकान में चोरी', 'ताला तोड़कर', 'burglary', 'house break',
    'broke into house', 'shop theft', 'ghar mein chori', 'dukan me chori', 'dukaan mein chori',
    'tala tod', 'taala tod',
  ],
  'bns-318-4': [
    'धोखाधड़ी', 'धोखा', 'ठगी', 'फ्रॉड', 'पैसे ठग', 'साइबर ठगी', 'cheated', 'scammed',
    'scammer', 'duped', 'conman', 'fake job', 'online fraud', 'cyber fraud', 'cyber crime',
    'otp fraud', 'bank fraud', 'investment scam', 'financial fraud', 'forgery', 'dhoka',
    'dhokhadhadi', 'dhokadhadi', 'thagi', 'thuggi', 'thag liya', 'paise le liye',
    'paisa kha gaya', 'paise wapas nahi', 'farzi', 'nakli', 'loot liya', 'chuna laga',
  ],
  'bns-316-2': [
    'अमानत में खयानत', 'विश्वासघात', 'embezzlement', 'misappropriation', 'kept my property',
    'not returning money', 'vishwasghat', 'amanat me khayanat', 'saman wapas nahi',
  ],
  'bns-117-2': [
    'गंभीर चोट', 'हड्डी टूट', 'फ्रैक्चर', 'सिर फोड़', 'लहूलुहान', 'broken bone',
    'severe injury', 'serious injury', 'hospitalized', 'bleeding heavily', 'stitches',
    'head injury', 'haddi tod', 'sir phod', 'sar fod', 'khoon nikal', 'lahuluhan',
  ],
  'bns-118-1': [
    'हथियार', 'चाकू', 'लाठी', 'डंडे', 'सरिया', 'तलवार', 'गोली', 'stabbed', 'stabbing',
    'dagger', 'sword', 'iron rod', 'club', 'lathi', 'danda', 'dande', 'chaku', 'chaaku',
    'chhuri', 'sariya', 'talwar', 'bandook', 'katta', 'sharp weapon', 'attacked with knife',
    'attacked with stick',
  ],
  'bns-126-2': [
    'रास्ता रोकना', 'रास्ता रोका', 'बंधक', 'कमरे में बंद', 'blocked my way', 'blocking road',
    'stopped me from going', 'locked in room', 'confined', 'confinement', 'held hostage',
    'rasta rok', 'raasta roka', 'jaane nahi diya', 'kamre me band', 'gher liya',
  ],
  'bns-329-3': [
    'जमीन विवाद', 'अवैध कब्जा', 'घर में घुस', 'प्रॉपर्टी विवाद', 'trespassing',
    'entered my house', 'entered my property', 'encroachment', 'illegal occupation',
    'land grab', 'kabza', 'kabja', 'jamin vivad', 'zameen kabza', 'ghar me ghus',
    'ghar mein ghus', 'zabarjasti ghus',
  ],
  'bns-281': [
    'एक्सीडेंट', 'दुर्घटना', 'लापरवाही से गाड़ी', 'तेज गाड़ी', 'टक्कर', 'road accident',
    'car crash', 'bike crash', 'hit and run', 'over speeding', 'reckless driving',
    'drunk driving', 'takkar', 'gaadi thok', 'gadi se takkar', 'bike se takkar',
    'tez रफ़्तार', 'tez gadi',
  ],
  'bns-85': [
    'दहेज', 'क्रूरता', 'प्रताड़ना', 'ससुराल', 'घरेलू हिंसा', 'domestic violence',
    'husband beating', 'in-laws harassment', 'in laws torture', 'marital cruelty',
    'mental torture', 'husband harassing', 'sasural', 'pati marta hai', 'pati peetta hai',
    'dahej mang', 'gharelu hinsa', 'pratadna',
  ],
  'bns-106-1': [
    'लापरवाही से मौत', 'सड़क दुर्घटना में मौत', 'accidental death', 'died in accident',
    'killed in road accident', 'medical negligence', 'death due to negligence',
    'accident me maut', 'takkar se maut', 'laparwahi se jaan',
  ],
  'bns-355': [
    'शराब', 'नशे में', 'हंगामा', 'intoxicated', 'drinking in public', 'creating ruckus',
    'drunken brawl', 'daaru', 'daru peekar', 'nashe me', 'nashe mein', 'hungama', 'bewda',
  ],
  'bns-109': [
    'हत्या का प्रयास', 'जानलेवा हमला', 'गोली चलाई', 'tried to kill', 'trying to kill',
    'murder attempt', 'attempted murder', 'life threatening attack', 'shot at', 'strangled',
    'poisoned', 'jaan se maarne ki koshish', 'janleva hamla', 'jaanleva hamla', 'gala dabane',
    'goli chala',
  ],
};
