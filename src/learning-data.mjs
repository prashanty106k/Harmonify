export const learningTopics = ['Short O','ER Words','Past Actions','ING Actions','SH Words','EE and OO Words','Blends and Objects','Short U','AI and OA Words','CK Words','EA Words','Magic E','Word Endings','CH Words','Mixed Picture Words'];

export const learningFeatures = [
  {title:'A welcoming place to begin',label:'HOME & NAVIGATION',icon:'grid',items:[
    'A branded home with English, Marathi and maths entry points, plus Home, Menu and Results navigation.',
    'Switch subjects and activities on scrollable screens with large touch targets, pastel cards and success sounds.',
    'Activities work offline without sign-in, advertisements or analytics integration.',
    'Activity and test state is saved across section navigation and normal Android activity recreation.'
  ]},
  {title:'Words meet their pictures',label:'ENGLISH',icon:'book',items:[
    'Explore Action Words and Home & School image vocabulary, plus fifteen picture-word topics.',
    'Each round has five pictures and five independently shuffled word cards.',
    'Drag a word to its picture, or tap a word and then a picture. Correct matches lock in place.',
    'Progress, positive feedback and next-round controls keep practice moving.',
    'Shuffled 25-question tests use four tap-to-select answers and question feedback.'
  ]},
  {title:'मराठीत शिकूया',label:'MARATHI',icon:'globe',items:[
    'क्रियापदे (action words), सूचना (instructions) and चित्र-वाक्ये (picture phrases).',
    'Five-pair matching rounds and 25-question tests, each with four answer options.',
    'Marathi lesson instructions, answers and Devanagari text.',
    'Some navigation and report text remains in English; complete app-wide localisation is not yet implemented.'
  ]},
  {title:'Make every rupee count',label:'MATHS · MONEY',icon:'coins',items:[
    'Separate ₹1–₹99 and ₹100–₹999 game and test ranges, with random target amounts.',
    'Coins: ₹1, ₹2, ₹5 and ₹10. Notes: ₹10, ₹20, ₹50, ₹100, ₹200 and ₹500.',
    'Tap denominations repeatedly to try any available combination that adds up exactly to the target.',
    'Hundreds, tens and ones grouping, a selected total, undo and clear controls, and feedback when the amount is too high.',
    'Denominations remain selectable after overshooting. An exact total earns completion feedback.',
    'Separate 25-question counting tests have four choices, including plausible digit and place-value mistakes.'
  ]},
  {title:'A good time to learn',label:'MATHS · TIME / वेळ',icon:'clock',items:[
    'Choose English or Marathi inside the clock section, available from both Home and Menu.',
    'Learn by tapping or dragging the selected hour or minute hand. Large plus/minus controls provide an accessible alternative.',
    'The hour hand moves continuously as minutes advance, with rollover at twelve.',
    'Full-hour, quarter-hour and five-minute difficulty levels.',
    'Digital time and English/Marathi time names, including सव्वा, साडे, पावणे, पाऊण, दीड and अडीच.',
    'Practice random target times: set both hands, check, get positive feedback, see a solved count and move to the next clock.',
    'Shuffled 25-question clock-reading tests have four tap-to-select choices.',
    'Saved clock-test results include score, date, duration, exact clock visuals, options and selected/correct answers.',
    'On-screen review and PDF clocks use the same drawing routine. Runtime drawings keep hands sharp and mathematically consistent.'
  ]},
  {title:'See the steps behind the score',label:'RESULTS & REPORTS',icon:'check',items:[
    'Local history records the subject and lesson, completion date/time, score and time taken.',
    'Review every question with its images, options, chosen answer and correct answer. Correct answers have a green outline; an incorrect choice has a red outline.',
    'Open PDFs in the in-app viewer, enlarge pages, optionally save a copy or share through Android.',
    'Duplicate-save protection, retention of older fields and recovery of readable entries when an individual stored entry is malformed.',
    'Android-managed result backup and device transfer follow your device settings. Saved or shared PDF copies are managed separately.'
  ]}
];

export const learningFaq = [
  ['Does DnyanVedh need the internet?', 'Core activities work offline after installation. Android backup, sharing and a storage or messaging service you choose may use the internet under their own settings.'],
  ['Are there ads or learner accounts?', 'The current app has no sign-in, advertisements, analytics integration, automatic crash reporting or developer-operated server connection. It does not ask for a child’s name or create named learner profiles.'],
  ['Is the whole app available in Marathi?', 'Marathi activities include Devanagari instructions and answers, and the clock section lets you choose English or Marathi. Some navigation and report areas still use English; full app-wide localisation is not implemented.'],
  ['Where are test results stored?', 'In private app storage on the device. Android may back up or transfer results according to device settings. Adults choose whether to save or share a PDF; those copies can be held by other apps or cloud providers.'],
  ['Can I delete results?', 'Android’s Clear storage control removes all local app data and resets the app. There is currently no individual-result deletion control. Delete exported PDFs separately, and manage backup copies in device settings.'],
  ['What should I know about the clock tests?', 'They use a twelve-hour teaching clock and do not distinguish AM from PM. Full-hour tests have twelve possible times, so some times necessarily repeat in a 25-question test.'],
  ['Is it available on Google Play?', 'DnyanVedh is not yet live on Google Play. We’ll add its store link here when it is published.']
];
