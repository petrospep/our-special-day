import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "el";

const languageLabels: Record<Language, string> = {
  en: "English",
  el: "Ελληνικά",
};

const validationTranslations: Record<string, string> = {
  "Enter your invitation code.": "Βάλτε τον κωδικό της πρόσκλησής σας.",
  "Enter a valid invitation code.": "Βάλτε έναν έγκυρο κωδικό πρόσκλησης.",
  "Enter first name.": "Γράψτε το όνομα.",
  "Enter last name.": "Γράψτε το επώνυμο.",
  "first name must be 80 characters or fewer.": "Το όνομα πρέπει να είναι έως 80 χαρακτήρες.",
  "last name must be 80 characters or fewer.": "Το επώνυμο πρέπει να είναι έως 80 χαρακτήρες.",
  "Enter a valid email address.": "Γράψτε μια έγκυρη διεύθυνση email.",
  "Email must be 254 characters or fewer.": "Το email πρέπει να είναι έως 254 χαρακτήρες.",
  "Phone number must be 40 characters or fewer.": "Το τηλέφωνο πρέπει να είναι έως 40 χαρακτήρες.",
  "Enter an age.": "Γράψτε την ηλικία.",
  "Age must be a whole number.": "Η ηλικία πρέπει να είναι ακέραιος αριθμός.",
  "Age must be between 0 and 12.": "Η ηλικία πρέπει να είναι από 0 έως 12.",
  "Enter the guest's age.": "Γράψτε την ηλικία του καλεσμένου.",
  "Guest count must be 10 or fewer.": "Μπορείτε να δηλώσετε έως 10 άτομα.",
  "Choose whether you will attend.": "Επιλέξτε αν θα έρθετε.",
  "Song title is required": "Γράψτε τίτλο τραγουδιού.",
  "Artist is required": "Γράψτε καλλιτέχνη.",
};

type LanguageContextValue = {
  language: Language;
  label: string;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  translateValidation: (message: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const urlLanguage = new URLSearchParams(window.location.search).get("lang");

  if (urlLanguage === "el" || urlLanguage === "en") {
    return urlLanguage;
  }

  return window.localStorage.getItem("site-language") === "el" ? "el" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("site-language", language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      label: languageLabels[language],
      setLanguage: setLanguageState,
      toggleLanguage: () => setLanguageState((current) => (current === "en" ? "el" : "en")),
      translateValidation: (message) =>
        language === "el" ? (validationTranslations[message] ?? message) : message,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
