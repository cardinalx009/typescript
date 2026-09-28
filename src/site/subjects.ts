import { TKey } from '../i18n';
import { SITE_PATHS } from '../sitePaths';

const img = (prompt: string) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_4_3`;

export type SubjectKey = 'english' | 'native' | 'biology' | 'chemistry';

export type CourseKey = 'english' | 'native' | 'science';

export interface SubjectMeta {
  key: SubjectKey;
  path: string;
  icon: string;
  image: string;
  nameKey: TKey;
  descKey: TKey;
  topicKeys: TKey[];
  courseKey: CourseKey;
  ring: string;
  bar: string;
}

export const SUBJECTS: SubjectMeta[] = [
  {
    key: 'english',
    path: SITE_PATHS.english,
    icon: '🇬🇧',
    image: img(
      'modern%20flat%20vector%20illustration%20of%20students%20studying%20English%20with%20open%20books%2C%20speech%20bubbles%20and%20a%20laptop%2C%20deep%20navy%20blue%20and%20white%20palette%2C%20clean%20minimal%20education%20branding%2C%20no%20text'
    ),
    nameKey: 'subjectEnglish',
    descKey: 'englishDesc',
    topicKeys: ['englishTopic1', 'englishTopic2', 'englishTopic3', 'englishTopic4'],
    courseKey: 'english',
    ring: 'hover:ring-navy-300',
    bar: 'from-navy-600 to-navy-800',
  },
  {
    key: 'native',
    path: SITE_PATHS.native,
    icon: '📖',
    image: img(
      'modern%20flat%20vector%20illustration%20of%20mother%20tongue%20literature%20and%20poetry%2C%20open%20book%20with%20quill%20pen%20and%20speech%20marks%2C%20deep%20navy%20blue%20and%20white%20with%20warm%20amber%20accents%2C%20clean%20minimal%20education%20branding%2C%20no%20text'
    ),
    nameKey: 'subjectNative',
    descKey: 'nativeDesc',
    topicKeys: ['nativeTopic1', 'nativeTopic2', 'nativeTopic3', 'nativeTopic4'],
    courseKey: 'native',
    ring: 'hover:ring-rose-300',
    bar: 'from-rose-500 to-red-700',
  },
  {
    key: 'biology',
    path: SITE_PATHS.biology,
    icon: '🧬',
    image: img(
      'modern%20flat%20vector%20illustration%20of%20biology%20science%2C%20microscope%2C%20cells%20and%20plant%20leaves%2C%20deep%20navy%20blue%20and%20white%20with%20teal%20accents%2C%20clean%20minimal%20education%20branding%2C%20no%20text'
    ),
    nameKey: 'subjectBiology',
    descKey: 'bioDesc',
    topicKeys: ['bioTopic1', 'bioTopic2', 'bioTopic3', 'bioTopic4'],
    courseKey: 'science',
    ring: 'hover:ring-emerald-300',
    bar: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'chemistry',
    path: SITE_PATHS.chemistry,
    icon: '🧪',
    image: img(
      'modern%20flat%20vector%20illustration%20of%20chemistry%2C%20glass%20flasks%2C%20molecular%20structures%20and%20atoms%2C%20deep%20navy%20blue%20and%20white%20with%20amber%20accents%2C%20clean%20minimal%20education%20branding%2C%20no%20text'
    ),
    nameKey: 'subjectChemistry',
    descKey: 'chemDesc',
    topicKeys: ['chemTopic1', 'chemTopic2', 'chemTopic3', 'chemTopic4'],
    courseKey: 'science',
    ring: 'hover:ring-amber-300',
    bar: 'from-amber-500 to-orange-600',
  },
];

export interface CourseMeta {
  key: CourseKey;
  nameKey: TKey;
}

export const COURSES: CourseMeta[] = [
  { key: 'english', nameKey: 'courseEnglish' },
  { key: 'native', nameKey: 'courseNative' },
  { key: 'science', nameKey: 'courseScience' },
];
