// Theme Management
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        themeIcon.classList.replace('fa-moon', 'fa-sun'); // Show sun in dark mode to enable light mode
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
}

// Initial Theme Check
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme) {
    setTheme(savedTheme);
} else if (systemPrefersDark) {
    setTheme('dark');
} else {
    setTheme('light');
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Canvas and Initial Logic
document.getElementById('date').valueAsDate = new Date();
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const bgImage = new Image();

bgImage.src = 'blank_design.jpg'; // আপনার ব্ল্যাংক ইমেজের নাম

const banglaDays = { "Saturday": "শনিবার", "Sunday": "রবিবার", "Monday": "সোমবার", "Tuesday": "মঙ্গলবার", "Wednesday": "বুধবার", "Thursday": "বৃহস্পতিবার", "Friday": "শুক্রবার" };
const banglaMonths = { 1: "জানুয়ারি", 2: "ফেব্রুয়ারি", 3: "মার্চ", 4: "এপ্রিল", 5: "মে", 6: "জুন", 7: "জুলাই", 8: "আগস্ট", 9: "সেপ্টেম্বর", 10: "অক্টোবর", 11: "নভেম্বর", 12: "ডিসেম্বর" };
const hijriMonths = { 1: "মুহররম", 2: "সফর", 3: "রবিউল আউয়াল", 4: "রবিউস সানি", 5: "জুমাদাল উলা", 6: "জুমাদাস সানি", 7: "রজব", 8: "শাবান", 9: "রমজান", 10: "শাওয়াল", 11: "জিলকদ", 12: "জিলহজ" };

function toBengaliNum(str) {
    const engToBng = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return str.toString().replace(/[0-9]/g, match => engToBng[match]);
}

function to12HourFormat(timeStr) {
    if (!timeStr) return "--:--";
    let time24 = timeStr.split(' ')[0];
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours, 10);
    hours = hours % 12 || 12;
    let strHours = hours < 10 ? '0' + hours : hours;
    return toBengaliNum(`${strHours}:${minutes}`);
}

function addMinutes(timeStr, minsToAdd) {
    let time24 = timeStr.split(' ')[0];
    let [hours, minutes] = time24.split(':').map(Number);
    let date = new Date();
    date.setHours(hours, minutes + minsToAdd);
    let h = date.getHours().toString().padStart(2, '0');
    let m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

async function generateImage() {
    document.getElementById('error-alert').style.display = 'none';
    const citySelect = document.getElementById('city');
    const city = citySelect.options[citySelect.selectedIndex].text.split(' ')[0]; // Extract just the English name
    const country = 'Bangladesh';
    const dateInput = document.getElementById('date').value;
    const hijriAdjustValue = parseInt(document.getElementById('hijri-adjust').value) || 0;
    const madhabValue = document.getElementById('madhab').value || '1';

    let apiDate = "";
    let apiDateForGregorian = "";
    if (dateInput) {
        const parts = dateInput.split('-');
        apiDate = `/${parts[2]}-${parts[1]}-${parts[0]}`;
        apiDateForGregorian = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
        const today = new Date();
        apiDateForGregorian = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    }

    const apiUrl = `https://api.aladhan.com/v1/timingsByCity${apiDate}?city=${city}&country=${country}&method=1&school=${madhabValue}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const timings = data.data.timings;
        let hijri = data.data.date.hijri;
        const gregorian = data.data.date.gregorian;

        if (hijriAdjustValue !== 0) {
            const hijriUrl = `https://api.aladhan.com/v1/gToH?date=${apiDateForGregorian}&adjustment=${hijriAdjustValue}&calendarMethod=MATHEMATICAL`;
            try {
                const hijriResponse = await fetch(hijriUrl);
                const hijriData = await hijriResponse.json();
                if (hijriData.code === 200) {
                    hijri = hijriData.data.hijri;
                    console.log("Updated Hijri Data:", hijri);
                }
            } catch (hError) {
                console.error("Hijri API Error:", hError);
            }
        }

        // নিশ্চিত করা হচ্ছে যে ফন্ট লোড হয়েছে কিনা
        document.fonts.ready.then(function () {
            setTimeout(() => {
                drawOnCanvas(timings, city, country, gregorian, hijri);
            }, 300);
        });

    } catch (error) {
        console.error("API Error:", error);
        alert("নামাজের সময় আনতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন চেক করুন।");
    }
}

function drawOnCanvas(timings, city, country, gregorian, hijri) {
    const SCALE_FACTOR = 2; // হাই রেজোলিউশনের জন্য স্কেল ফ্যাক্টর (যেমন 2160x2160 এর জন্য 2)
    const baseWidth = 1080;
    const baseHeight = 1080;

    canvas.width = baseWidth * SCALE_FACTOR;
    canvas.height = baseHeight * SCALE_FACTOR;

    // ব্যাকগ্রাউন্ড ইমেজ নতুন সাইজে আঁকা
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // এরপর বাকি সব কিছু অরিজিনাল 1080p কোঅর্ডিনেট হিসেবে আঁকতে ম্যাজিক স্কেল ব্যবহার
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    // ==========================================
    // নতুন ক্যালকুলেট করা পজিশন (আপনার ইমেজের ছক অনুযায়ী)
    // ==========================================
    const headerCenterX = 540;
    const dateY = 195;          // তারিখের লাইন একটু নিচে নামানো হয়েছে
    const locationY = 235;      // লোকেশনের লাইন একটু নিচে নামানো হয়েছে

    // মূল টেবিল (শুরু কলাম)
    const mainTimeX = 735;
    const fajrY = 355;
    const dhuhrY = 400;
    const asrY = 445;
    const maghribY = 490;
    const ishaY = 535;
    const duhaY = 580;
    const tahajjudY = 625;

    // সাহরি ও ইফতার (বাম দিকের টেবিল)
    const botLeftX = 485;      // "সময়" কলামের নিচে এলাইন করার জন্য একটু বামে সরানো হলো (আগে 440 ছিল)
    const sahriY = 750;        // সূর্যাস্ত/সূর্যোদয়ের সাথে মেলানো
    const iftarY = 798;

    // সূর্যোদয় ও সূর্যাস্ত (ডান দিকের টেবিল)
    const botRightX = 820;
    const sunriseY = 750;
    const sunsetY = 798;
    // ==========================================

    const dayName = banglaDays[gregorian.weekday.en];
    const gregDate = `${toBengaliNum(gregorian.day)} ${banglaMonths[gregorian.month.number]}, ${toBengaliNum(gregorian.year)}`;

    // gToH returns month.number as a string sometimes, ensure lookup matches integer keys
    const hijriMonthInt = parseInt(hijri.month.number);
    const hijriDate = `${toBengaliNum(hijri.day)} ${hijriMonths[hijriMonthInt]}, ${toBengaliNum(hijri.year)}`;

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    // সোলাইমানলিপি ফন্ট ব্যবহার
    ctx.font = "bold 26px 'SolaimanLipi', 'Siyam Rupali', 'Kalpurush', Arial, sans-serif";
    ctx.fillText(`${dayName}, ${gregDate} • ${hijriDate}`, headerCenterX, dateY);

    ctx.font = "22px 'SolaimanLipi', 'Siyam Rupali', 'Kalpurush', Arial, sans-serif";
    ctx.fillText(`লোকেশন: ${city}, ${country}`, headerCenterX, locationY);

    const sahriAdjustValue = parseInt(document.getElementById('sahri-adjust').value) || 0;
    const iftarAdjustValue = parseInt(document.getElementById('iftar-adjust').value) || 0;

    // সাহরির শেষ সময় হবে ফজরের সময় থেকে ৩ মিনিট আগে 
    let baseSahri = addMinutes(timings.Fajr, -3);
    let finalSahri = addMinutes(baseSahri, sahriAdjustValue);

    let finalIftar = addMinutes(timings.Maghrib, iftarAdjustValue);

    // ভেতরের কালো টেক্সট
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px 'SolaimanLipi', 'Siyam Rupali', 'Kalpurush', Arial, sans-serif"; // ফন্ট সাইজ এবং সোলাইমানলিপি

    ctx.fillText(to12HourFormat(timings.Fajr), mainTimeX, fajrY);
    ctx.fillText(to12HourFormat(timings.Dhuhr), mainTimeX, dhuhrY);
    ctx.fillText(to12HourFormat(timings.Asr), mainTimeX, asrY);
    ctx.fillText(to12HourFormat(finalIftar), mainTimeX, maghribY);
    ctx.fillText(to12HourFormat(timings.Isha), mainTimeX, ishaY);

    const duhaTime = addMinutes(timings.Sunrise, 15);
    ctx.fillText(to12HourFormat(duhaTime), mainTimeX, duhaY);
    ctx.fillText(to12HourFormat(timings.Isha), mainTimeX, tahajjudY); // তাহাজ্জুদের শুরু এশার পর থেকে ধরা হয়েছে

    // নিচের টেবিল (সাদা টেক্সট)
    ctx.fillStyle = "#ffffff";

    ctx.fillText(to12HourFormat(finalSahri), botLeftX, sahriY);
    ctx.fillText(to12HourFormat(finalIftar), botLeftX, iftarY);

    ctx.fillText(to12HourFormat(timings.Sunrise), botRightX, sunriseY);
    ctx.fillText(to12HourFormat(timings.Sunset), botRightX, sunsetY);
}

// ডাউনলোড ফাংশন
function downloadImage() {
    try {
        const link = document.createElement('a');
        link.download = 'Muslim_AI_Browser_Post.jpg';
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        document.getElementById('error-alert').style.display = 'none';
    } catch (err) {
        // Tainted Canvas (CORS) এরর ধরার জন্য
        const errorBox = document.getElementById('error-alert');
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<strong>ডাউনলোড ব্লক হয়েছে!</strong> আপনি ফাইলটি সরাসরি ডাবল ক্লিক করে ব্রাউজারে ওপেন করেছেন (CORS issue)। <br> <strong>সমাধান:</strong> VS Code এর 'Live Server' এক্সটেনশন ব্যবহার করে ওপেন করুন, অথবা এই HTML কোডটি গিটহাবে/যেকোনো লোকাল সার্ভারে হোস্ট করুন।`;
        console.error("Canvas Download Error:", err);
    }
}

bgImage.onload = () => {
    // পেজ লোডের সময়ও ফন্ট রেডি হওয়ার জন্য অপেক্ষা করা
    document.fonts.ready.then(function () {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    });
};
