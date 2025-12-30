# Translation Guidelines for HealthCardGo

**Document Version:** 1.0
**Last Updated:** December 31, 2025
**Languages:** English (en), Filipino/Tagalog (fil), Cebuano/Bisaya (ceb)

---

## 1. Overview

This document provides guidelines for translating medical and healthcare content in the HealthCardGo system. Translations must maintain medical accuracy, cultural appropriateness, and professional tone while ensuring patient comprehension.

**Target Audience:** Patients and healthcare workers in Panabo City, Davao del Norte, Philippines

**Primary Language:** Cebuano (spoken by majority of Panabo City residents)
**Secondary Language:** Filipino/Tagalog (national language)
**Administrative Language:** English (for all staff and administrators)

---

## 2. General Translation Principles

### 2.1 Medical Accuracy
- **CRITICAL:** Medical terminology must be accurate and unambiguous
- Use established medical terms from authoritative sources:
  - Department of Health (DOH) Philippines official translations
  - MedlinePlus Tagalog health information
  - Philippine Medical Association terminology
- When in doubt, consult medical professionals familiar with local dialects

### 2.2 Cultural Appropriateness
- Avoid terms with religious or spiritual connotations in medical contexts
- Use formal/respectful language (po, opo in Tagalog; palihug, kanimo in Cebuano)
- Consider local euphemisms for sensitive topics (HIV, pregnancy)
- Respect barangay-specific dialectal variations

### 2.3 No Code-Switching
- **AVOID:** Mixing English and local languages in same sentence
- **WRONG:** "Congratulations! Gi-approve na ang imong account"
- **RIGHT:** "Maligayang balita! Gi-approve na ang imong account"
- Exception: Technical acronyms (HIV, AIDS, COVID-19) remain in English

### 2.4 Consistency
- Use the same translation for recurring terms throughout the application
- Maintain glossary of standardized medical terms
- Follow existing translations in messages/en.json, messages/fil.json, messages/ceb.json

---

## 3. Medical Terminology Standards

### 3.1 Common Medical Terms

| English | Filipino/Tagalog | Cebuano/Bisaya | Notes |
|---------|------------------|----------------|-------|
| Laboratory Testing | Pagsusuri sa Laboratoryo | Pagsusi sa Laboratoryo | NOT "Laboratory Testing" (untranslated) |
| Diagnosis | Diyagnosis | Diyagnosis | Accepted medical loanword |
| Intensive Care Unit | Yunit ng Pag-aalaga sa Kritikal na Kalagayan | Unit sa Pag-atiman sa Kritikal nga Kahimtang | Full translation preferred |
| Appointment | Appointment | Appointment | Accepted medical loanword |
| Queue Number | Numero sa Pila | Numero sa Linya | "Pila" (Tagalog), "Linya" (Cebuano) |
| Checked In | Nakarating na | Naabot na | NOT "Nag-check In" (code-switching) |
| Forecast/Prediction | Hula | Hula | NOT "Panagna" (spiritual connotation) |
| Pregnancy | Pagbubuntis | Pagmabdos | Regional variation |
| Prenatal Care | Pangangalaga bago manganak | Pag-atiman sa dili pa manganak | Full phrase translation |

### 3.2 Disease Names

**Retain English for internationally recognized diseases:**
- HIV/AIDS (do NOT translate)
- COVID-19 (do NOT translate)
- Dengue (accepted loanword)
- Malaria (accepted loanword)
- Measles → Tigdas (translate)
- Rabies → Rabis (translate)

### 3.3 Sensitive Medical Topics

**HIV/AIDS:**
- Use clinical language, avoid stigmatizing terms
- Filipino: "Pagsusuri para sa HIV" (HIV testing)
- Cebuano: "Pagsusi para sa HIV"

**Pregnancy:**
- Use respectful, supportive language
- Filipino: "Pagbubuntis" (pregnancy)
- Cebuano: "Pagmabdos" (pregnancy)
- Emphasize health and safety: "kalusugan at kaligtasan" / "panglawas ug kaluwasan"

---

## 4. Translation Quality Standards

### 4.1 Accuracy Levels

**Level 1 - Critical (99% accuracy required):**
- Medical diagnoses
- Treatment instructions
- Prescription information
- Appointment times and dates
- Emergency notifications
- Medical record data

**Level 2 - Important (95% accuracy required):**
- Service descriptions
- Health education content
- Appointment reminders
- Feedback forms
- Privacy policies

**Level 3 - General (90% accuracy required):**
- Navigation labels
- Button text
- General notifications
- Landing page content

### 4.2 Machine Translation Limitations

**Google Translate:**
- Accuracy: ~90% for Filipino/Tagalog medical content
- Accuracy: ~70-80% for Cebuano medical content
- **RECOMMENDATION:** Use for initial draft only, ALWAYS review by native medical translator

**Professional Translation Required For:**
- Critical medical terminology (Level 1)
- Patient-facing medical instructions
- Legal/compliance content
- Privacy policies

---

## 5. Regional Considerations

### 5.1 Panabo City Context

**Demographics:**
- Primary language: Cebuano/Bisaya
- Secondary language: Filipino/Tagalog (understood by most)
- English: Limited proficiency among older patients

**Healthcare Setting:**
- 41 barangays in Panabo City
- Mix of urban and rural populations
- Varying literacy levels
- Strong community health worker presence

### 5.2 Dialectal Variations

**Cebuano in Panabo City:**
- "Pagmabdos" (pregnancy) preferred over "Pagbuntis"
- "Panglawas" (health) preferred over "Lawas"
- "Palihug" (please) formal request
- "Kanimo" (to you) respectful second person

**Filipino/Tagalog:**
- Use formal register (po, opo, kayo)
- Avoid slang or colloquialisms
- Match Department of Health official translations when available

---

## 6. Translation Workflow

### 6.1 Initial Translation
1. Use English (en.json) as source of truth
2. Draft Filipino translation using DOH resources + professional translator
3. Draft Cebuano translation using medical glossary + native speaker
4. Review for code-switching and untranslated terms

### 6.2 Quality Assurance
1. **Linguistic Review:** Native speaker checks grammar, tone, comprehension
2. **Medical Review:** Healthcare professional verifies medical accuracy
3. **Cultural Review:** Local community member checks appropriateness
4. **User Testing:** Test with actual patients for comprehension

### 6.3 Maintenance
- Update all 3 language files simultaneously when adding new features
- Maintain translation changelog
- Quarterly review by professional translators
- Annual review by medical advisory board

---

## 7. Specific Translation Challenges

### 7.1 Scientific Terms

**SARIMA (Statistical Model):**
- Filipino: "Mga Hula ng SARIMA" (predictions)
- Cebuano: "Mga Hula sa SARIMA" (NOT "Panagna" - spiritual connotation)
- Keep acronym "SARIMA" in English

**Disease Surveillance:**
- Filipino: "Pagsubaybay sa Sakit"
- Cebuano: "Pagsubay sa Sakit"
- Context: Public health monitoring (not individual patient tracking)

### 7.2 Administrative Terms

**Account Approval:**
- Filipino: "Naaprubahan ang Account"
- Cebuano: "Gi-approve na ang Account"
- Use positive, congratulatory tone: "Maligayang balita!" (not "Congratulations!")

**Queue Management:**
- Filipino: "Numero sa Pila" (line number)
- Cebuano: "Numero sa Linya" (line number)
- Context: Appointment queue system (1-100 per day)

### 7.3 Time and Date Formats

**Dates:**
- Format: YYYY-MM-DD (ISO 8601)
- Display: "Petsa" (both languages)
- Example: "2025-12-31"

**Times:**
- Format: 24-hour clock
- Display: "Oras" (both languages)
- Example: "14:00" (2:00 PM)

---

## 8. Resources

### 8.1 Authoritative Sources

**Filipino/Tagalog:**
- [DOH Philippines](https://doh.gov.ph) - Official health translations
- [MedlinePlus Tagalog](https://medlineplus.gov/tagalog/) - Health encyclopedia
- [CMS Tagalog Glossary](https://www.cms.gov/glossary-tagalog) - Medical terminology

**Cebuano/Bisaya:**
- [Binisaya.com](https://www.binisaya.com) - Cebuano-English dictionary
- [Cebuano Wikipedia](https://ceb.wikipedia.org) - General reference
- University of San Carlos (Cebu) - Linguistics department consultation

**Professional Services:**
- Gengo, TranslatorsCafe.com - Medical translation specialists
- Philippine Translators Association - Certified medical translators
- Local: Ateneo de Davao University, UP Mindanao - Linguistics faculty

### 8.2 Budget Recommendations

**Professional Translation Services:**
- Initial translation (320+ keys): $1,000 - $2,000
- Medical review: $500 - $1,000
- Cultural review: $300 - $500
- **Total estimated cost:** $1,800 - $3,500

**Annual Maintenance:**
- Quarterly reviews: $500/year
- New feature translations: $100-200 per major update
- Emergency corrections: $50-100 per incident

---

## 9. Quality Checklist

Before approving any translation, verify:

- [ ] No code-switching (English mixed with Filipino/Cebuano)
- [ ] No untranslated medical terms (except accepted loanwords)
- [ ] Consistent terminology across all sections
- [ ] Appropriate formality level (respectful language)
- [ ] No religious/spiritual terms in medical contexts
- [ ] Cultural appropriateness for Panabo City
- [ ] Medical accuracy verified by healthcare professional
- [ ] Native speaker comprehension tested
- [ ] Matches English source content (no additions/omissions)
- [ ] Special characters rendered correctly (ñ, á, etc.)

---

## 10. Contact

**For Translation Issues:**
- Primary: Project manager at Panabo City Health Office
- Technical: HealthCardGo development team
- Medical: Panabo City Health Officer

**External Consultants:**
- Linguistics expert (to be hired): [TBD]
- Medical translator (to be hired): [TBD]

---

## Appendix A: Common Errors to Avoid

1. ❌ "Congratulations!" in Cebuano → ✅ "Maligayang balita!" or "Salamat!"
2. ❌ "Nag-check In" → ✅ "Nakarating na" (Filipino) / "Naabot na" (Cebuano)
3. ❌ "Laboratory Testing" (untranslated) → ✅ "Pagsusuri sa Laboratoryo" / "Pagsusi sa Laboratoryo"
4. ❌ "Mga Panagna sa SARIMA" → ✅ "Mga Hula sa SARIMA"
5. ❌ Pregnancy describing dentistry → ✅ Pregnancy describing prenatal care

---

## Appendix B: Translation File Structure

```
messages/
├── en.json (10,514 bytes) - Source of truth
├── fil.json (11,839 bytes) - Filipino/Tagalog
└── ceb.json (11,764 bytes) - Cebuano/Bisaya

Total: 320+ translation keys
Sections: common, navigation, notifications, appointments, feedback, disease_surveillance, landing
```

---

**Document Status:** ✅ Active
**Next Review:** March 31, 2026
**Owner:** HealthCardGo Translation Team
