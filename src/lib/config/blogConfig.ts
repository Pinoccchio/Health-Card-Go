import { BookOpen } from 'lucide-react';

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML content
  author: string;
  authorRole: string;
  date: string;
  category: string;
  categoryColor: string;
  image: string;
  readTime: string;
}

export const BLOG_CATEGORIES = {
  HEALTH_CARDS: 'Health Cards',
  MATERNAL_HEALTH: 'Maternal Health',
  HEALTH_EDUCATION: 'Health Education',
  DISEASE_PREVENTION: 'Disease Prevention',
  PUBLIC_HEALTH: 'Public Health',
} as const;

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    slug: 'health-card-requirements-panabo-city',
    title: 'Understanding Health Card Requirements in Panabo City',
    excerpt: 'Learn about the different types of health cards available and the requirements needed for each category.',
    content: `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">What is a Health Card?</h2>
      <p class="mb-4">In Panabo City, the Health Card from the City Health Office (CHO) is a mandatory identification card that proves a worker is medically fit for employment. This system ensures public health safety across various industries.</p>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Types of Health Cards</h3>

      <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
        <h4 class="font-bold text-gray-800 mb-2">🟡 Yellow Card (Food Handler)</h4>
        <p class="mb-2">For workers in the food industry including cooks, servers, and food processors.</p>
        <p class="font-semibold mb-1">Required Tests:</p>
        <ul class="list-disc list-inside ml-4">
          <li>Urinalysis</li>
          <li>Stool Test (Fecalysis)</li>
          <li>Complete Blood Count (CBC)</li>
          <li>Chest X-ray</li>
        </ul>
      </div>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
        <h4 class="font-bold text-gray-800 mb-2">🟢 Green Card (Non-Food Industry)</h4>
        <p class="mb-2">For workers in non-food industries such as construction, retail, and general services.</p>
        <p class="font-semibold mb-1">Required Tests:</p>
        <ul class="list-disc list-inside ml-4">
          <li>Urinalysis</li>
          <li>Stool Test</li>
          <li>Complete Blood Count (CBC)</li>
          <li>Chest X-ray</li>
        </ul>
      </div>

      <div class="bg-pink-50 border-l-4 border-pink-500 p-4 mb-4">
        <h4 class="font-bold text-gray-800 mb-2">🩷 Pink Card (Service & Clinical)</h4>
        <p class="mb-2">For workers in occupations involving skin-to-skin contact such as nurses, massage therapists, and beauticians.</p>
        <p class="font-semibold mb-1">Required Tests:</p>
        <ul class="list-disc list-inside ml-4">
          <li>Gram Stain</li>
          <li>Hepatitis B Test</li>
          <li>Syphilis Test</li>
          <li>HIV Test</li>
        </ul>
      </div>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">General Requirements</h3>
      <ul class="list-disc list-inside ml-4 mb-4">
        <li>Valid Government ID</li>
        <li>Community Tax Certificate (Cedula)</li>
        <li>Laboratory Results (from accredited facilities)</li>
        <li>Payment Receipt from City Treasurer's Office</li>
      </ul>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">How to Apply</h3>
      <p class="mb-4">You can now apply online through our HealthCardGo system. Book your appointment, upload your requirements, and get your health card without the long queues!</p>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p class="text-sm text-blue-800">💡 <strong>Pro Tip:</strong> Complete your laboratory tests at least 7 days before booking your appointment to ensure smooth processing.</p>
      </div>
    `,
    author: 'City Health Office',
    authorRole: 'Health Services',
    date: '2025-01-15',
    category: BLOG_CATEGORIES.HEALTH_CARDS,
    categoryColor: '#10B981', // emerald-500
    image: '/images/blog/health-card.jpg',
    readTime: '5 min read',
  },
  {
    id: 2,
    slug: 'prenatal-checkup-importance',
    title: 'The Importance of Regular Prenatal Checkups',
    excerpt: 'Discover why regular prenatal visits are crucial for both mother and baby health during pregnancy.',
    content: `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Why Prenatal Care Matters</h2>
      <p class="mb-4">Prenatal checkups are essential healthcare visits during pregnancy that monitor the health of both mother and baby. The City Health Office of Panabo strongly encourages all pregnant mothers to complete at least eight (8) prenatal checkups.</p>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Benefits of Regular Prenatal Care</h3>

      <div class="space-y-4 mb-6">
        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">1</div>
          <div>
            <h4 class="font-bold text-gray-800 mb-1">Early Detection of Complications</h4>
            <p class="text-gray-600">Regular checkups help identify potential health issues early, allowing for timely intervention and treatment.</p>
          </div>
        </div>

        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">2</div>
          <div>
            <h4 class="font-bold text-gray-800 mb-1">Monitor Baby's Development</h4>
            <p class="text-gray-600">Track your baby's growth, heartbeat, and position throughout the pregnancy.</p>
          </div>
        </div>

        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">3</div>
          <div>
            <h4 class="font-bold text-gray-800 mb-1">Receive Proper Vaccinations</h4>
            <p class="text-gray-600">Get necessary maternal vaccinations to protect both you and your baby.</p>
          </div>
        </div>

        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">4</div>
          <div>
            <h4 class="font-bold text-gray-800 mb-1">Nutritional Guidance</h4>
            <p class="text-gray-600">Receive expert advice on diet, vitamins, and nutrition for a healthy pregnancy.</p>
          </div>
        </div>
      </div>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Recommended Checkup Schedule</h3>
      <ul class="list-disc list-inside ml-4 mb-4">
        <li><strong>Weeks 4-28:</strong> One visit per month</li>
        <li><strong>Weeks 28-36:</strong> One visit every 2 weeks</li>
        <li><strong>Weeks 36-40:</strong> One visit per week</li>
      </ul>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Our Services</h3>
      <p class="mb-4">The Panabo City Health Office provides comprehensive prenatal care including:</p>
      <ul class="list-disc list-inside ml-4 mb-4">
        <li>Free prenatal consultations every Tuesday</li>
        <li>Laboratory tests and ultrasound</li>
        <li>Maternal vaccinations</li>
        <li>Nutrition counseling</li>
        <li>Family planning education</li>
        <li>PhilHealth Konsulta access</li>
      </ul>

      <div class="bg-pink-50 border-l-4 border-pink-500 p-4 mt-6">
        <p class="font-bold text-gray-800 mb-2">⚠️ Important Reminder</p>
        <p class="text-gray-700">Home births are strongly discouraged for the safety of both mother and child. Please deliver at a healthcare facility with trained professionals.</p>
      </div>

      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
        <p class="text-sm text-green-800">📅 <strong>Book Your Appointment:</strong> Schedule your prenatal checkup every Tuesday through our online booking system for convenient access to care.</p>
      </div>
    `,
    author: 'Maternal Health Team',
    authorRole: 'Pregnancy Services',
    date: '2025-01-10',
    category: BLOG_CATEGORIES.MATERNAL_HEALTH,
    categoryColor: '#EC4899', // pink-500
    image: '/images/blog/prenatal.jpg',
    readTime: '7 min read',
  },
  {
    id: 3,
    slug: 'hiv-awareness-breaking-stigma',
    title: 'HIV Awareness: Breaking the Stigma',
    excerpt: 'Understanding HIV, prevention methods, and the importance of confidential testing services.',
    content: `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Understanding HIV/AIDS</h2>
      <p class="mb-4">HIV (Human Immunodeficiency Virus) is a virus that attacks the body's immune system. Without treatment, it can lead to AIDS (Acquired Immunodeficiency Syndrome). However, with modern treatment, people with HIV can live long, healthy lives.</p>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Breaking the Stigma</h3>
      <p class="mb-4">Stigma and discrimination remain major barriers to HIV prevention and treatment. It's important to understand:</p>

      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <ul class="space-y-2">
          <li class="flex items-start gap-2">
            <span class="text-purple-600 font-bold">✓</span>
            <span>HIV cannot be transmitted through casual contact like hugging, shaking hands, or sharing utensils</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-purple-600 font-bold">✓</span>
            <span>People with HIV who take medication as prescribed can achieve undetectable viral loads, meaning they cannot transmit the virus</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-purple-600 font-bold">✓</span>
            <span>HIV testing is confidential and free at our health center</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-purple-600 font-bold">✓</span>
            <span>Early detection and treatment save lives</span>
          </li>
        </ul>
      </div>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Prevention Methods</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
          <h4 class="font-bold text-gray-800 mb-2">PrEP (Pre-Exposure Prophylaxis)</h4>
          <p class="text-sm text-gray-600">Medication taken before potential exposure to HIV to prevent infection.</p>
        </div>

        <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
          <h4 class="font-bold text-gray-800 mb-2">Safe Practices</h4>
          <p class="text-sm text-gray-600">Use of protection and avoiding sharing needles or syringes.</p>
        </div>

        <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
          <h4 class="font-bold text-gray-800 mb-2">Regular Testing</h4>
          <p class="text-sm text-gray-600">Know your status through confidential HIV testing.</p>
        </div>

        <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
          <h4 class="font-bold text-gray-800 mb-2">Treatment as Prevention</h4>
          <p class="text-sm text-gray-600">People on effective treatment cannot transmit HIV (U=U: Undetectable = Untransmittable).</p>
        </div>
      </div>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Our Services at Social Hygiene Center</h3>
      <p class="mb-4">The Panabo City Health Office Social Hygiene and Wellness Center offers 100% confidential services:</p>

      <ul class="list-disc list-inside ml-4 mb-4 space-y-2">
        <li><strong>Free HIV Testing:</strong> Confidential counseling and testing</li>
        <li><strong>STI Screening:</strong> Free checkups and treatment</li>
        <li><strong>PrEP Consultations:</strong> Expert guidance on prevention</li>
        <li><strong>Support Services:</strong> Counseling and referrals</li>
        <li><strong>Education Programs:</strong> Community awareness initiatives</li>
      </ul>

      <h3 class="text-xl font-bold text-gray-800 mb-3 mt-6">Clinic Schedule</h3>
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <p class="mb-2"><strong>Regular Hours:</strong> Mondays, Wednesdays, and Fridays (1 PM to 3 PM)</p>
        <p><strong>Sundown Clinics:</strong> 6 PM to 11 PM (evening access for working individuals)</p>
      </div>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-6">
        <p class="font-bold text-purple-800 mb-2">🔒 Your Privacy is Our Promise</p>
        <p class="text-purple-700">All HIV testing and counseling services are 100% confidential. No names are ever shared. Book online or walk in during clinic hours.</p>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p class="text-sm text-blue-800">📞 <strong>Need Help?</strong> Contact our Social Hygiene Center for confidential support. Remember: Knowing your status is the first step to living a healthy life.</p>
      </div>
    `,
    author: 'Social Hygiene Center',
    authorRole: 'HIV Services',
    date: '2025-01-05',
    category: BLOG_CATEGORIES.HEALTH_EDUCATION,
    categoryColor: '#8B5CF6', // violet-500
    image: '/images/blog/hiv-awareness.jpg',
    readTime: '6 min read',
  },
];
