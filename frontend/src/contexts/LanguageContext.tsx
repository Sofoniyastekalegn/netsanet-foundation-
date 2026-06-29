import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'en' | 'am';

interface LanguageContextType {
    lang: Language;
    setLang: (l: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navbar
        'nav.home': 'Home',
        'nav.caseStories': 'Case Stories',
        'nav.supportDirectory': 'Support Directory',
        'nav.legalAdvisor': 'Legal Advisor',
        'nav.appealGenerator': 'Appeal Generator',
        'nav.storyWall': 'Story Wall',
        'nav.signIn': 'Sign In',
        'nav.signUp': 'Sign Up',
        'nav.signOut': 'Sign Out',
        'nav.myDashboard': 'My Dashboard',
        'nav.adminDashboard': 'Admin Dashboard',
        // Home
        'home.hero.title': 'Netsanet',
        'home.hero.subtitle': 'AI-Powered Support for Women in Ethiopia',
        'home.hero.desc': "Get legal guidance, generate formal appeals, and connect with support organizations. You're not alone in your journey toward justice and empowerment.",
        'home.hero.cta1': 'Get Legal Advice',
        'home.hero.cta2': 'Find Support',
        'home.features.title': 'How We Can Help You',
        // Appeal Generator
        'appeal.title': 'Appeal Letter Generator',
        'appeal.subtitle': 'Fill in your case details — Netsanet will generate a formal appeal letter in English and Amharic.',
        'appeal.form.title': 'Case Information',
        'appeal.name': 'Full Name',
        'appeal.caseType': 'Case Type',
        'appeal.selectCase': 'Select case type',
        'appeal.date': 'Incident Date',
        'appeal.location': 'Location',
        'appeal.description': 'Case Description',
        'appeal.evidence': 'Evidence',
        'appeal.evidenceOptional': 'Evidence (optional)',
        'appeal.evidenceHint': 'Upload a file, paste a Google Drive link, or describe evidence...',
        'appeal.contact': 'Contact Information',
        'appeal.phone': 'Phone (+251...)',
        'appeal.email': 'Email',
        'appeal.generate': 'Generate Appeal Letter',
        'appeal.newAppeal': 'New Appeal',
        'appeal.generating': 'Generating…',
        'appeal.followUpPlaceholder': "Ask a follow-up — e.g. 'Make it more formal'…",
        'appeal.export': 'Export your appeal letter:',
        'appeal.copyAll': 'Copy All',
        'appeal.downloadFull': 'Download (EN+AM)',
        'appeal.downloadAm': 'Download (AM only)',
        // Legal Advisor
        'legal.title': 'AI Legal Advisor',
        'legal.subtitle': 'Personalized legal guidance based on Ethiopian law and women\'s rights',
        'legal.region': 'Region',
        'legal.newChat': 'New chat',
        'legal.placeholder': 'Describe your situation or ask a follow-up question…',
        'legal.welcome': 'How can I help you today?',
        'legal.welcomeDesc': "Ask me anything about your legal situation — I'll give you guidance based on Ethiopian law.",
        'legal.thinking': 'Thinking…',
        // Support Directory
        'support.title': 'Support Directory',
        'support.subtitle': 'Find legal aid organizations and support services in your region',
        'support.allRegions': 'All Regions',
        'support.orgFound': 'organizations found',
        'support.noOrg': 'No organizations found',
        'support.emergency': 'Emergency Contacts',
        'support.police': 'Police Emergency',
        'support.helpline': "Women's Helpline",
        'support.legalHotline': 'Legal Aid Hotline',
        'support.searchCity': 'Search city or region...',
        // Case Stories
        'stories.title': 'Case Stories',
        'stories.subtitle': 'Read inspiring stories from other women who have overcome similar challenges',
        'stories.allCategories': 'All Categories',
        'stories.shareTitle': 'Share Your Story',
        'stories.shareDesc': 'Your experience can inspire and help other women. Share your story anonymously on our Story Wall to support the community.',
        'stories.shareBtn': 'Share Your Story',
        // General
        'general.loading': 'Loading...',
        'general.error': 'Something went wrong. Please try again.',
        'general.quota': 'The AI service is temporarily unavailable due to high demand. Please try again in a minute.',
        'general.copy': 'Copy',
        'general.save': 'Save',
        'general.required': 'required',
        'general.optional': 'optional',
    },
    am: {
        // Navbar
        'nav.home': 'መነሻ',
        'nav.caseStories': 'የጉዳይ ታሪኮች',
        'nav.supportDirectory': 'የድጋፍ ማዕከል',
        'nav.legalAdvisor': 'የህግ አማካሪ',
        'nav.appealGenerator': 'ይግባኝ ደብዳቤ',
        'nav.storyWall': 'የታሪክ ግድግዳ',
        'nav.signIn': 'ግባ',
        'nav.signUp': 'ተመዝገብ',
        'nav.signOut': 'ውጣ',
        'nav.myDashboard': 'ዳሽቦርዴ',
        'nav.adminDashboard': 'አስተዳዳሪ ዳሽቦርድ',
        // Home
        'home.hero.title': 'ነፃነት',
        'home.hero.subtitle': 'ለኢትዮጵያ ሴቶች AI-ደጋፊ አገልግሎት',
        'home.hero.desc': 'የህግ ምክር ያግኙ፣ ይፋዊ ይግባኝ ደብዳቤዎችን ይፍጠሩ፣ እና ከድጋፍ ድርጅቶች ጋር ይገናኙ። ለፍትህ እና ለብቃት በሚደረገው ጉዞ ብቸኛ አይደሉም።',
        'home.hero.cta1': 'የህግ ምክር ያግኙ',
        'home.hero.cta2': 'ድጋፍ ያግኙ',
        'home.features.title': 'እንዴት ልንረዳዎ እንችላለን',
        // Appeal Generator
        'appeal.title': 'ይግባኝ ደብዳቤ ፈጣሪ',
        'appeal.subtitle': 'የጉዳይዎን ዝርዝሮች ያስገቡ — ነፃነት ይፋዊ ይግባኝ ደብዳቤ ያዘጋጅልዎታል።',
        'appeal.form.title': 'የጉዳይ መረጃ',
        'appeal.name': 'ሙሉ ስም',
        'appeal.caseType': 'የጉዳይ ዓይነት',
        'appeal.selectCase': 'የጉዳይ ዓይነት ይምረጡ',
        'appeal.date': 'የክስተት ቀን',
        'appeal.location': 'ቦታ',
        'appeal.description': 'የጉዳይ መግለጫ',
        'appeal.evidence': 'ማስረጃ',
        'appeal.evidenceOptional': 'ማስረጃ (አማራጭ)',
        'appeal.evidenceHint': 'ፋይል ይጫኑ፣ Google Drive ሊንክ ይለጥፉ፣ ወይም ማስረጃ ይግለጹ...',
        'appeal.contact': 'የትብብር መረጃ',
        'appeal.phone': 'ስልክ (+251...)',
        'appeal.email': 'ኢሜይል',
        'appeal.generate': 'ይግባኝ ደብዳቤ ፍጠር',
        'appeal.newAppeal': 'አዲስ ይግባኝ',
        'appeal.generating': 'በመፍጠር ላይ…',
        'appeal.followUpPlaceholder': 'ጥያቄ ይጠይቁ — ለምሳሌ «ይበልጥ ይፋ አድርጉት»…',
        'appeal.export': 'ይግባኝ ደብዳቤዎን ላክ:',
        'appeal.copyAll': 'ሁሉንም ቅዳ',
        'appeal.downloadFull': 'አውርድ (EN+AM)',
        'appeal.downloadAm': 'አውርድ (AM ብቻ)',
        // Legal Advisor
        'legal.title': 'AI የህግ አማካሪ',
        'legal.subtitle': 'በኢትዮጵያ ህግ እና የሴቶች መብቶች ላይ የተመሰረተ ምክር',
        'legal.region': 'ክልል',
        'legal.newChat': 'አዲስ ውይይት',
        'legal.placeholder': 'ሁኔታዎን ይግለጹ ወይም ጥያቄ ይጠይቁ…',
        'legal.welcome': 'ዛሬ እንዴት ልረዳዎ እችላለሁ?',
        'legal.welcomeDesc': 'ስለ ህጋዊ ሁኔታዎ ማንኛውም ጥያቄ ይጠይቁ — በኢትዮጵያ ህግ ምክር እሰጣለሁ።',
        'legal.thinking': 'በማሰብ ላይ…',
        // Support Directory
        'support.title': 'የድጋፍ ማዕከል',
        'support.subtitle': 'በክልልዎ የሕግ ዕርዳታ ድርጅቶች እና የድጋፍ አገልግሎቶችን ያግኙ',
        'support.allRegions': 'ሁሉም ክልሎች',
        'support.orgFound': 'ድርጅቶች ተገኝተዋል',
        'support.noOrg': 'ምንም ድርጅቶች አልተገኙም',
        'support.emergency': 'የአደጋ ጊዜ ዕውቂያዎች',
        'support.police': 'የፖሊስ አደጋ',
        'support.helpline': 'የሴቶች መስመር',
        'support.legalHotline': 'የሕግ ዕርዳታ ሞቅ መስመር',
        'support.searchCity': 'ከተማ ወይም ክልል ይፈልጉ...',
        // Case Stories
        'stories.title': 'የጉዳይ ታሪኮች',
        'stories.subtitle': 'ተመሳሳይ ፈተናዎችን ያሸነፉ ሌሎች ሴቶች አነሳሽ ታሪኮችን ያንብቡ',
        'stories.allCategories': 'ሁሉም ምድቦች',
        'stories.shareTitle': 'ታሪኮዎን ያጋሩ',
        'stories.shareDesc': 'ልምዶዎ ሌሎች ሴቶችን ሊያነሳሳ ይችላል። ታሪኮዎን ሳይታወቅ ያጋሩ።',
        'stories.shareBtn': 'ታሪኩን ያጋሩ',
        // General
        'general.loading': 'በመጫን ላይ...',
        'general.error': 'ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
        'general.quota': 'AI አገልግሎቱ ጊዜያዊ ሁኔታ አይገኝም። እባክዎ ከደቂቃ በኋላ ይሞክሩ።',
        'general.copy': 'ቅዳ',
        'general.save': 'አስቀምጥ',
        'general.required': 'አስፈላጊ',
        'general.optional': 'አማራጭ',
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLang] = useState<Language>('en');
    const t = (key: string) => translations[lang][key] ?? translations['en'][key] ?? key;
    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
