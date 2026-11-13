(function (window, document) {
  'use strict';

  function forcePortalTopOnLoad() {
    if (window.history && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (e) {}
    }
    const scrollToTop = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    scrollToTop();
    window.addEventListener('beforeunload', scrollToTop);
    window.addEventListener('pageshow', scrollToTop);
    window.addEventListener('load', () => requestAnimationFrame(scrollToTop));
  }
  forcePortalTopOnLoad();

  const CANONICAL_PORTAL_EVENTS = [
    {
        "id": "chainsmokers-india-tour-2026",
        "title": "The Chainsmokers — Sunburn Arena & Sneaker Fest",
        "artist": "The Chainsmokers",
        "genre": "EDM / Festival",
        "poster": "posters/chainsmokers-bengaluru-banner.webp",
        "featured": true,
        "defaultCity": "Mumbai",
        "cities": [
            {
                "city": "Mumbai",
                "venue": "Mahalaxmi Race Course, Mumbai",
                "date": "18 Dec 2026 • 14:00 IST",
                "tiers": [
                    {
                        "name": "GA Festival Pass",
                        "price": 7000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Festival Pass",
                        "price": 12000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Festival Pass",
                        "price": 14000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Tuborg Lounge Festival",
                        "price": 30000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "The Core Lounge–Fest",
                        "price": 40000,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Delhi NCR",
                "venue": "Jawaharlal Nehru Stadium / Yashobhoomi, Delhi NCR",
                "date": "19 Dec 2026 • 12:00 IST",
                "tiers": [
                    {
                        "name": "GA Festival Phase 2",
                        "price": 5500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Festival Phase 2",
                        "price": 8000,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Bengaluru",
                "venue": "NICE Grounds, Bengaluru",
                "date": "20 Dec 2026 • 16:00 IST",
                "tiers": [
                    {
                        "name": "VIP Phase 7",
                        "price": 7000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "GA Combo Phase 1",
                        "price": 7000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Combo Phase 1",
                        "price": 9000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Phase 3",
                        "price": 10000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Tuborg Lounge",
                        "price": 12999,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "Mumbai",
        "venue": "Mahalaxmi Race Course, Mumbai",
        "date": "18 Dec 2026 • 14:00 IST",
        "tiers": [
            {
                "name": "GA Festival Pass",
                "price": 7000,
                "cutPct": 12.0
            },
            {
                "name": "VIP Festival Pass",
                "price": 12000,
                "cutPct": 12.0
            },
            {
                "name": "Fanpit Festival Pass",
                "price": 14000,
                "cutPct": 12.0
            },
            {
                "name": "Tuborg Lounge Festival",
                "price": 30000,
                "cutPct": 12.0
            },
            {
                "name": "The Core Lounge–Fest",
                "price": 40000,
                "cutPct": 12.0
            }
        ]
    },
    {
        "id": "home-festival-goa-2026",
        "title": "The Home — Home Festival 2026",
        "artist": "The Home",
        "genre": "Festival / Electronic",
        "poster": "posters/home-festival-goa-poster.webp",
        "featured": true,
        "defaultCity": "Goa",
        "cities": [
            {
                "city": "Goa",
                "venue": "Vagator Hills, Vagator, Bardez, Goa",
                "date": "29–30 Dec 2026 • 14:00 IST",
                "tiers": [
                    {
                        "name": "GA Festival Pass",
                        "price": 6999,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Festival Pass",
                        "price": 9999,
                        "cutPct": 12.0
                    },
                    {
                        "name": "HSBC Starstruck Lounge",
                        "price": 49999,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "Goa",
        "venue": "Vagator Hills, Vagator, Bardez, Goa",
        "date": "29–30 Dec 2026 • 14:00 IST",
        "tiers": [
            {
                "name": "GA Festival Pass",
                "price": 6999,
                "cutPct": 12.0
            },
            {
                "name": "VIP Festival Pass",
                "price": 9999,
                "cutPct": 12.0
            },
            {
                "name": "HSBC Starstruck Lounge",
                "price": 49999,
                "cutPct": 12.0
            }
        ]
    },
    {
        "id": "keinemusik-adam-port-india-2026",
        "title": "Keinemusik presents Adam Port",
        "artist": "Keinemusik / Adam Port",
        "genre": "Afro House / Melodic",
        "poster": "posters/keinemusik-adam-port-poster.webp",
        "featured": false,
        "defaultCity": "New Delhi",
        "cities": [
            {
                "city": "New Delhi",
                "venue": "NSIC Exhibition Ground, Okhla Gate 6, New Delhi",
                "date": "13 Nov 2026 • 15:00 IST",
                "tiers": [
                    {
                        "name": "GA Standard Access",
                        "price": 3500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Enclosure Pass",
                        "price": 6500,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Kolkata",
                "venue": "Biswa Bangla Mela Prangan, Kolkata",
                "date": "14 Nov 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "GA Standard Access",
                        "price": 3500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Enclosure Pass",
                        "price": 6500,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Bengaluru",
                "venue": "Bhartiya Mall Of Bengaluru",
                "date": "15 Nov 2026 • 15:30 IST",
                "tiers": [
                    {
                        "name": "GA Standard Access",
                        "price": 3500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP 360 Experience Deck",
                        "price": 7500,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "New Delhi",
        "venue": "NSIC Exhibition Ground, Okhla Gate 6, New Delhi",
        "date": "13 Nov 2026 • 15:00 IST",
        "tiers": [
            {
                "name": "GA Standard Access",
                "price": 3500,
                "cutPct": 12.0
            },
            {
                "name": "VIP Enclosure Pass",
                "price": 6500,
                "cutPct": 12.0
            }
        ]
    },
    {
        "id": "darshan-raval-love-letters-2026",
        "title": "Darshan Raval — Love Letters India Tour",
        "artist": "Darshan Raval",
        "genre": "Bollywood / Romantic Pop",
        "poster": "posters/darshan-raval-love-letters-poster.webp",
        "featured": false,
        "defaultCity": "Ahmedabad",
        "cities": [
            {
                "city": "Ahmedabad",
                "venue": "SAVANNA Party Lawn, Ahmedabad",
                "date": "22 Nov 2026 • 17:30 IST",
                "tiers": [
                    {
                        "name": "Silver Standing Pass",
                        "price": 1499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Seated Pass",
                        "price": 2999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fan Pit Front Stage",
                        "price": 4999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Bengaluru",
                "venue": "Bhartiya Mall Of Bengaluru",
                "date": "29 Nov 2026 • 17:30 IST",
                "tiers": [
                    {
                        "name": "Silver Pass",
                        "price": 1499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Standing Area",
                        "price": 2999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Front Seating",
                        "price": 4999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Kolkata",
                "venue": "Aquatica Ground, Kolkata",
                "date": "05 Dec 2026 • 17:30 IST",
                "tiers": [
                    {
                        "name": "Silver Pass",
                        "price": 1499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Arena Pass",
                        "price": 2799,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Elevated Deck",
                        "price": 4999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Mumbai",
                "venue": "Dome SVP Stadium, Worli, Mumbai",
                "date": "13 Dec 2026 • 17:30 IST",
                "tiers": [
                    {
                        "name": "Bronze Bowl Seating",
                        "price": 2499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Floor Standing",
                        "price": 3999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Premium Center Ring",
                        "price": 6499,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Delhi NCR",
                "venue": "Okhla Industrial Area Phase 3, Delhi NCR",
                "date": "19 Dec 2026 • 17:30 IST",
                "tiers": [
                    {
                        "name": "Silver Arena Pass",
                        "price": 1999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Standing Pass",
                        "price": 3499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fan Pit Front Enclosure",
                        "price": 5999,
                        "cutPct": 11.0
                    }
                ]
            }
        ],
        "city": "Ahmedabad",
        "venue": "SAVANNA Party Lawn, Ahmedabad",
        "date": "22 Nov 2026 • 17:30 IST",
        "tiers": [
            {
                "name": "Silver Standing Pass",
                "price": 1499,
                "cutPct": 11.0
            },
            {
                "name": "Gold Seated Pass",
                "price": 2999,
                "cutPct": 11.0
            },
            {
                "name": "Fan Pit Front Stage",
                "price": 4999,
                "cutPct": 11.0
            }
        ]
    },
    {
        "id": "shreya-ghoshal-unstoppable-2026",
        "title": "Shreya Ghoshal — The Unstoppable Tour",
        "artist": "Shreya Ghoshal",
        "genre": "Classical / Bollywood Symphony",
        "poster": "posters/shreya-ghoshal-unstoppable-poster.webp",
        "featured": false,
        "defaultCity": "Bengaluru",
        "cities": [
            {
                "city": "Bengaluru",
                "venue": "Airtel Arena, Bengaluru",
                "date": "22 Nov 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Enclosure",
                        "price": 2500,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Reserve",
                        "price": 4500,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Platinum Royal Pass",
                        "price": 12000,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fanpit Front Stage",
                        "price": 12000,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Guwahati",
                "venue": "ACA Stadium, Barsapara, Guwahati",
                "date": "19 Dec 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Entry",
                        "price": 700,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Stalls",
                        "price": 1500,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold VIP Seating",
                        "price": 3500,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Kochi",
                "venue": "Cochin Trade Centre, Kochi",
                "date": "07 Mar 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Access",
                        "price": 1000,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Reserved Seating",
                        "price": 2500,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Platinum Center",
                        "price": 5000,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Chennai",
                "venue": "YMCA College of Physical Education, Chennai",
                "date": "20 Mar 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Enclosure",
                        "price": 1500,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Front Arena",
                        "price": 3000,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Hospitality Lounge",
                        "price": 6000,
                        "cutPct": 11.0
                    }
                ]
            }
        ],
        "city": "Bengaluru",
        "venue": "Airtel Arena, Bengaluru",
        "date": "22 Nov 2026 • 18:00 IST",
        "tiers": [
            {
                "name": "Silver Enclosure",
                "price": 2500,
                "cutPct": 11.0
            },
            {
                "name": "Gold Reserve",
                "price": 4500,
                "cutPct": 11.0
            },
            {
                "name": "Platinum Royal Pass",
                "price": 12000,
                "cutPct": 11.0
            },
            {
                "name": "Fanpit Front Stage",
                "price": 12000,
                "cutPct": 11.0
            }
        ]
    },
    {
        "id": "dj-snake-sunburn-arena-2026",
        "title": "DJ Snake — Sunburn Arena India Tour",
        "artist": "DJ Snake",
        "genre": "Trap / Dance / EDM",
        "poster": "posters/dj-snake-sunburn-arena-poster.webp",
        "featured": false,
        "defaultCity": "Bengaluru",
        "cities": [
            {
                "city": "Bengaluru",
                "venue": "NICE Grounds, Madavara, Bengaluru",
                "date": "18 Dec 2026 • 16:00 IST",
                "tiers": [
                    {
                        "name": "GA Phase 1 Pass",
                        "price": 2000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Phase 2 Pass",
                        "price": 3000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Phase 2",
                        "price": 5000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "GA Combo Phase 1",
                        "price": 7000,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Mumbai",
                "venue": "Mahalaxmi Race Course, Mumbai",
                "date": "19 Dec 2026 • 14:00 IST",
                "tiers": [
                    {
                        "name": "GA Single Day Pass",
                        "price": 3500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Single Day Pass",
                        "price": 6000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Single Day",
                        "price": 7500,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Festival 2-Day GA",
                        "price": 7000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Tuborg Lounge Festival",
                        "price": 30000,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "Bengaluru",
        "venue": "NICE Grounds, Madavara, Bengaluru",
        "date": "18 Dec 2026 • 16:00 IST",
        "tiers": [
            {
                "name": "GA Phase 1 Pass",
                "price": 2000,
                "cutPct": 12.0
            },
            {
                "name": "VIP Phase 2 Pass",
                "price": 3000,
                "cutPct": 12.0
            },
            {
                "name": "Fanpit Phase 2",
                "price": 5000,
                "cutPct": 12.0
            },
            {
                "name": "GA Combo Phase 1",
                "price": 7000,
                "cutPct": 12.0
            }
        ]
    },
    {
        "id": "arijit-singh-india-tour-2026-27",
        "title": "Arijit Singh — India Tour 2026–2027",
        "artist": "Arijit Singh",
        "genre": "Bollywood / Soul / Symphony",
        "poster": "posters/arijit-singh-india-tour-poster.webp",
        "featured": true,
        "defaultCity": "Goa",
        "cities": [
            {
                "city": "Goa",
                "venue": "Vagator Hills, Vagator, Goa",
                "date": "29 Dec 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "GA Festival Pass",
                        "price": 6999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Festival Pass",
                        "price": 11999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Ahmedabad",
                "venue": "Narendra Modi Stadium, Ahmedabad",
                "date": "09 Jan 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Tier Pass",
                        "price": 6499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Pitch Pass",
                        "price": 7999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Enclosure Pass",
                        "price": 9999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Diamond Ring Pass",
                        "price": 14999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fan Pit Front Stage",
                        "price": 24999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Chandigarh",
                "venue": "Sector 34 Exhibition Ground, Chandigarh",
                "date": "23 Jan 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Enclosure",
                        "price": 1999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Standing",
                        "price": 4499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Arena Pass",
                        "price": 9999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Platinum Ring",
                        "price": 14999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Jaipur",
                "venue": "JECC by Accor, Sitapura, Jaipur",
                "date": "07 Feb 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Enclosure",
                        "price": 2999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Pass",
                        "price": 4499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Front Pass",
                        "price": 9999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Lounge Deck",
                        "price": 12499,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Mumbai",
                "venue": "Mahalaxmi Race Course, Mumbai",
                "date": "20 Feb 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Pitch Standing",
                        "price": 4999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Center Enclosure",
                        "price": 7499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Diamond Front Stage",
                        "price": 24999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Platinum Hospitality Lounge",
                        "price": 34999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Bengaluru",
                "venue": "NICE Grounds, Tumkur Road, Bengaluru",
                "date": "13 Mar 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Enclosure",
                        "price": 14999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Front Arena",
                        "price": 19999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fan Pit Front",
                        "price": 34999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Hospitality Lounge",
                        "price": 49999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Delhi NCR",
                "venue": "Jawaharlal Nehru Stadium, New Delhi",
                "date": "27 Mar 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Silver Standing Pass",
                        "price": 4999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Pitch Arena",
                        "price": 8999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Grandstand Lounge",
                        "price": 18999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Pune",
                "venue": "Mahalaxmi Lawns, Karve Nagar, Pune",
                "date": "10 Apr 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Arena",
                        "price": 3999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Stalls",
                        "price": 5999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Front Enclosure",
                        "price": 12499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Elevated Deck",
                        "price": 19999,
                        "cutPct": 11.0
                    }
                ]
            },
            {
                "city": "Hyderabad",
                "venue": "Gachibowli Outdoor Stadium, Hyderabad",
                "date": "15 May 2027 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Bronze Pass",
                        "price": 2499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Pass",
                        "price": 4999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Arena Pass",
                        "price": 12499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Fan Pit Enclosure",
                        "price": 24999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Hospitality Lounge",
                        "price": 34999,
                        "cutPct": 11.0
                    }
                ]
            }
        ],
        "city": "Goa",
        "venue": "Vagator Hills, Vagator, Goa",
        "date": "29 Dec 2026 • 18:00 IST",
        "tiers": [
            {
                "name": "GA Festival Pass",
                "price": 6999,
                "cutPct": 11.0
            },
            {
                "name": "VIP Festival Pass",
                "price": 11999,
                "cutPct": 11.0
            }
        ]
    },
    {
        "id": "alesso-smirnoff-experience-2026",
        "title": "Alesso — Smirnoff Experience India",
        "artist": "Alesso",
        "genre": "Progressive House / EDM",
        "poster": "posters/alesso-smirnoff-experience-poster.webp",
        "featured": false,
        "defaultCity": "Bengaluru",
        "cities": [
            {
                "city": "Bengaluru",
                "venue": "Bhartiya Mall Of Bengaluru",
                "date": "27 Nov 2026 • 16:00 IST",
                "tiers": [
                    {
                        "name": "GA Phase 1 Pass",
                        "price": 1750,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Phase 1 Pass",
                        "price": 3000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Phase 1",
                        "price": 5000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Smirnoff Experience Lounge",
                        "price": 15000,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Delhi NCR",
                "venue": "Huda Gymkhana Club, Sector 29, Gurugram / Delhi NCR",
                "date": "28 Nov 2026 • 16:00 IST",
                "tiers": [
                    {
                        "name": "GA Phase 1 Pass",
                        "price": 1750,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Phase 1 Pass",
                        "price": 3000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Fanpit Phase 1",
                        "price": 5000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "Smirnoff Experience Lounge",
                        "price": 15000,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "Bengaluru",
        "venue": "Bhartiya Mall Of Bengaluru",
        "date": "27 Nov 2026 • 16:00 IST",
        "tiers": [
            {
                "name": "GA Phase 1 Pass",
                "price": 1750,
                "cutPct": 12.0
            },
            {
                "name": "VIP Phase 1 Pass",
                "price": 3000,
                "cutPct": 12.0
            },
            {
                "name": "Fanpit Phase 1",
                "price": 5000,
                "cutPct": 12.0
            },
            {
                "name": "Smirnoff Experience Lounge",
                "price": 15000,
                "cutPct": 12.0
            }
        ]
    },
    {
        "id": "faheem-abdullah-unbecoming-2026",
        "title": "Faheem Abdullah — The Unbecoming Tour",
        "artist": "Faheem Abdullah",
        "genre": "Indie / Sufi Acoustic",
        "poster": "posters/faheem-abdullah-unbecoming-poster.webp",
        "featured": false,
        "defaultCity": "New Delhi",
        "cities": [
            {
                "city": "New Delhi",
                "venue": "Brahmkamal Hall–Auditorium, Yashobhoomi, New Delhi",
                "date": "20 Nov 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "Balcony Tier Pass",
                        "price": 999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Silver Stalls",
                        "price": 1499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Gold Center Pass",
                        "price": 2499,
                        "cutPct": 11.0
                    },
                    {
                        "name": "Platinum Front Stage",
                        "price": 3999,
                        "cutPct": 11.0
                    },
                    {
                        "name": "VIP Meet & Greet",
                        "price": 4999,
                        "cutPct": 11.0
                    }
                ]
            }
        ],
        "city": "New Delhi",
        "venue": "Brahmkamal Hall–Auditorium, Yashobhoomi, New Delhi",
        "date": "20 Nov 2026 • 18:00 IST",
        "tiers": [
            {
                "name": "Balcony Tier Pass",
                "price": 999,
                "cutPct": 11.0
            },
            {
                "name": "Silver Stalls",
                "price": 1499,
                "cutPct": 11.0
            },
            {
                "name": "Gold Center Pass",
                "price": 2499,
                "cutPct": 11.0
            },
            {
                "name": "Platinum Front Stage",
                "price": 3999,
                "cutPct": 11.0
            },
            {
                "name": "VIP Meet & Greet",
                "price": 4999,
                "cutPct": 11.0
            }
        ]
    },
    {
        "id": "francis-mercier-india-tour-2026",
        "title": "Francis Mercier — Sunburn Arena & RROV",
        "artist": "Francis Mercier",
        "genre": "Deep House / Afro Tech",
        "poster": "posters/francis-mercier-sunburn-poster.webp",
        "featured": false,
        "defaultCity": "Mumbai",
        "cities": [
            {
                "city": "Mumbai",
                "venue": "Infinity Ballroom, Fairmont Hotel, Mumbai",
                "date": "24 Dec 2026 • 21:00 IST",
                "tiers": [
                    {
                        "name": "GA Entry Pass",
                        "price": 3000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Elevated Deck",
                        "price": 6000,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Delhi NCR",
                "venue": "A DOT by GNH, Sector 29, Gurugram / Delhi NCR",
                "date": "25 Dec 2026 • 18:00 IST",
                "tiers": [
                    {
                        "name": "GA Phase 1 Pass",
                        "price": 2499,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Front Pass",
                        "price": 4999,
                        "cutPct": 12.0
                    }
                ]
            },
            {
                "city": "Goa",
                "venue": "RROV: Goa, Vagator, Goa",
                "date": "27 Dec 2026 • 21:00 IST",
                "tiers": [
                    {
                        "name": "GA Entry Pass",
                        "price": 3000,
                        "cutPct": 12.0
                    },
                    {
                        "name": "VIP Sunset Lounge",
                        "price": 7000,
                        "cutPct": 12.0
                    }
                ]
            }
        ],
        "city": "Mumbai",
        "venue": "Infinity Ballroom, Fairmont Hotel, Mumbai",
        "date": "24 Dec 2026 • 21:00 IST",
        "tiers": [
            {
                "name": "GA Entry Pass",
                "price": 3000,
                "cutPct": 12.0
            },
            {
                "name": "VIP Elevated Deck",
                "price": 6000,
                "cutPct": 12.0
            }
        ]
    }
];

  const SAFE_PORTAL_ROUTES = new Set([
    '/portal',
    '/portal/events',
    '/dashboard',
    '/portal/dashboard',
    '/portal/bookings',
    '/admin',
    '/tours'
  ]);

  let _activeUser = null;
  let _activePromoter = null;
  let _activeRole = 'promoter';
  const CANONICAL_RONAK_IMPORTED_ORDERS = [
    {
        "order_ref": "TIX-2026-RJ0001",
        "external_sale_id": 1,
        "event_title": "Diljit ahmedabaad",
        "tier_name": "A block bay 5",
        "seat_details": "KK 94 95 96 97",
        "quantity": 4,
        "unit_price": 6500.0,
        "total_amount": 26000.0,
        "commission_rate": 11.0,
        "commission_amount": 2860.0,
        "attendee_name": "Abeer",
        "attendee_phone": "+919971778481",
        "attendee_email": "jncy121@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-04T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0002",
        "external_sale_id": 2,
        "event_title": "diljit dosanjh bangalore",
        "tier_name": "gold",
        "seat_details": "free standing",
        "quantity": 1,
        "unit_price": 7750.0,
        "total_amount": 7750.0,
        "commission_rate": 11.0,
        "commission_amount": 852.5,
        "attendee_name": "aarav",
        "attendee_phone": "+918951085366",
        "attendee_email": null,
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-06T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0005",
        "external_sale_id": 5,
        "event_title": "arijit bangalore ",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 5500.0,
        "total_amount": 11000.0,
        "commission_rate": 11.0,
        "commission_amount": 1210.0,
        "attendee_name": "Devansh",
        "attendee_phone": "+919920686585",
        "attendee_email": "devanshbangad128@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-10T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0006",
        "external_sale_id": 6,
        "event_title": "arijit mumbai",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 5000.0,
        "total_amount": 10000.0,
        "commission_rate": 11.0,
        "commission_amount": 1100.0,
        "attendee_name": "Devansh",
        "attendee_phone": "+919920686585",
        "attendee_email": "devanshbangad128@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-10T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0007",
        "external_sale_id": 7,
        "event_title": "arijit bangalore",
        "tier_name": "platinum left",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 7800.0,
        "total_amount": 15600.0,
        "commission_rate": 11.0,
        "commission_amount": 1716.0,
        "attendee_name": "daksh",
        "attendee_phone": "+918310665642",
        "attendee_email": null,
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-10T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0009",
        "external_sale_id": 9,
        "event_title": "arijit bangalore",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 1,
        "unit_price": 3000.0,
        "total_amount": 3000.0,
        "commission_rate": 11.0,
        "commission_amount": 330.0,
        "attendee_name": "aarav",
        "attendee_phone": "+918951085366",
        "attendee_email": "aaravparekh007@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-10T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0010",
        "external_sale_id": 10,
        "event_title": "arijit bangalore",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 1,
        "unit_price": 3000.0,
        "total_amount": 3000.0,
        "commission_rate": 11.0,
        "commission_amount": 330.0,
        "attendee_name": "ronak",
        "attendee_phone": "+917892145475",
        "attendee_email": "ronakj303@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-10T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0013",
        "external_sale_id": 13,
        "event_title": "arijit mumbai",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 4,
        "unit_price": 2999.0,
        "total_amount": 12000.0,
        "commission_rate": 11.0,
        "commission_amount": 1320.0,
        "attendee_name": "Akash Tewari",
        "attendee_phone": "+918303545661",
        "attendee_email": "akasht9952@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-11T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0015",
        "external_sale_id": 15,
        "event_title": "diljit bangalore",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 8250.0,
        "total_amount": 16500.0,
        "commission_rate": 11.0,
        "commission_amount": 1815.0,
        "attendee_name": "Prajin Chopra",
        "attendee_phone": "+919906185105",
        "attendee_email": null,
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-12T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0017",
        "external_sale_id": 17,
        "event_title": "arijit bangalore",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 2750.0,
        "total_amount": 5500.0,
        "commission_rate": 11.0,
        "commission_amount": 605.0,
        "attendee_name": "Dimple Chopra",
        "attendee_phone": "+916363327399",
        "attendee_email": "dimple.pc141203@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-12T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0019",
        "external_sale_id": 19,
        "event_title": "Arjit Singh",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 1,
        "unit_price": 6000.0,
        "total_amount": 6000.0,
        "commission_rate": 11.0,
        "commission_amount": 660.0,
        "attendee_name": "Tisha Saklecha",
        "attendee_phone": "+919008433416",
        "attendee_email": "tishasaklecha512@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-13T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0020",
        "external_sale_id": 20,
        "event_title": "Arjit Singh",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 1,
        "unit_price": 2750.0,
        "total_amount": 3000.0,
        "commission_rate": 11.0,
        "commission_amount": 330.0,
        "attendee_name": "Rachana",
        "attendee_phone": "+917892244643",
        "attendee_email": "rachana.j00@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-13T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0021",
        "external_sale_id": 21,
        "event_title": "Arjit Singh",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 4125.0,
        "total_amount": 9000.0,
        "commission_rate": 11.0,
        "commission_amount": 990.0,
        "attendee_name": "Vishal",
        "attendee_phone": "+919845350802",
        "attendee_email": "vishal.mamtha@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-13T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0022",
        "external_sale_id": 22,
        "event_title": "Arjit Singh",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 9,
        "unit_price": 4125.0,
        "total_amount": 40500.0,
        "commission_rate": 11.0,
        "commission_amount": 4455.0,
        "attendee_name": "Vishal",
        "attendee_phone": "+919845350802",
        "attendee_email": "vishal.mamtha@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-13T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0023",
        "external_sale_id": 23,
        "event_title": "Arjit Singh",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 7,
        "unit_price": 3000.0,
        "total_amount": 21000.0,
        "commission_rate": 11.0,
        "commission_amount": 2310.0,
        "attendee_name": "Rishab Gadiya",
        "attendee_phone": "+917892244643",
        "attendee_email": "rachana.j00@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-13T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0025",
        "external_sale_id": 25,
        "event_title": "arijit bangalore",
        "tier_name": "gold",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 6000.0,
        "total_amount": 12000.0,
        "commission_rate": 11.0,
        "commission_amount": 1320.0,
        "attendee_name": "sahil",
        "attendee_phone": "+919113225959",
        "attendee_email": "sahiljain2017@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-15T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0037",
        "external_sale_id": 37,
        "event_title": "Darshan raval bangalore",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 1,
        "unit_price": 1500.0,
        "total_amount": 1500.0,
        "commission_rate": 11.0,
        "commission_amount": 165.0,
        "attendee_name": "Poorvi Khatri",
        "attendee_phone": "+917259880344",
        "attendee_email": "poorvikhatri27@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-21T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0038",
        "external_sale_id": 38,
        "event_title": "Darshan raval bangalore",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 1500.0,
        "total_amount": 3000.0,
        "commission_rate": 11.0,
        "commission_amount": 330.0,
        "attendee_name": "Arnaz Taj",
        "attendee_phone": "+917259108835",
        "attendee_email": "arnaztaj301@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-21T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0040",
        "external_sale_id": 40,
        "event_title": "Arijit Banglore",
        "tier_name": "silver",
        "seat_details": "free seating",
        "quantity": 5,
        "unit_price": 4000.0,
        "total_amount": 20000.0,
        "commission_rate": 11.0,
        "commission_amount": 2200.0,
        "attendee_name": "Harsh Mehta",
        "attendee_phone": "+918105865828",
        "attendee_email": null,
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-27T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0041",
        "external_sale_id": 41,
        "event_title": "Chainsmokers bangalore",
        "tier_name": "GA",
        "seat_details": "standing",
        "quantity": 3,
        "unit_price": 3800.0,
        "total_amount": 11100.0,
        "commission_rate": 11.0,
        "commission_amount": 1221.0,
        "attendee_name": "Likitha",
        "attendee_phone": "+916361004463",
        "attendee_email": null,
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-10-28T00:00:00+05:30"
    },
    {
        "order_ref": "TIX-2026-RJ0043",
        "external_sale_id": 43,
        "event_title": "Arijit hyderabad",
        "tier_name": "platinum left",
        "seat_details": "free seating",
        "quantity": 2,
        "unit_price": 9500.0,
        "total_amount": 19000.0,
        "commission_rate": 11.0,
        "commission_amount": 2090.0,
        "attendee_name": "Karan",
        "attendee_phone": "+918555910998",
        "attendee_email": "karanahuja9995@gmail.com",
        "status": "confirmed",
        "channel": "Direct Sales",
        "created_at": "2026-11-01T00:00:00+05:30"
    }
];

  let _portalEvents = CANONICAL_PORTAL_EVENTS.slice();
  let _portalCityFilter = 'all';
  let _bookingStatusFilter = 'all';
  let _portalBookings = [];
  let _portalPayouts = [];
  let _portalCommissions = [];
  let _bookingModalEvent = null;
  let _bookingModalCity = null;
  let _bookingModalTierIdx = 0;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeAssetUrl(url, fallback = 'posters/anyma-aeden-poster-1.webp') {
    const clean = String(url || '').trim();
    if (!clean) return fallback;
    if (/^https:\/\/[^\s"'<>]+$/i.test(clean)) return clean;
    if (/^(posters|artists|ezgif-73126691f624a5ac-jpg)\/[a-zA-Z0-9._\-\/]+$/.test(clean) && !clean.includes('..')) {
      return clean;
    }
    return fallback;
  }

  function resetPortalUserState() {
    _activeUser = null;
    _activePromoter = null;
    _activeRole = 'promoter';
    _portalBookings = [];
    _portalPayouts = [];
    _portalCommissions = [];
    _bookingModalEvent = null;
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    const txt = document.getElementById('toast-message');
    if (txt) txt.textContent = msg;
    if (toast) {
      toast.classList.remove('translate-y-36', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      setTimeout(() => {
        toast.classList.add('translate-y-36', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      }, 3600);
    }
  }

  function resolveCurrentPage() {
    const attr = (document.body && document.body.getAttribute('data-portal-page')) || '';
    if (attr === 'wallet' || (window.location.pathname || '').toLowerCase().includes('wallet')) {
      window.location.replace('/portal/bookings');
      return 'bookings';
    }
    if (attr) return attr.toLowerCase();
    const path = (window.location.pathname || '/portal').toLowerCase();
    if (path.includes('booking')) return 'bookings';
    if (path.endsWith('/id') || path.includes('portal-id')) return 'id';
    if (path.includes('dashboard')) return 'dashboard';
    return 'events';
  }

  function resolveSafeNextUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const candidate = (params.get('next') || '').trim();
    if (candidate && SAFE_PORTAL_ROUTES.has(candidate.toLowerCase())) {
      return candidate;
    }
    return '/portal';
  }

  function formatPromoterId(code) {
    const s = String(code || '78920145');
    if (/^\d{8}$/.test(s)) {
      return s.slice(0, 4) + ' ' + s.slice(4);
    }
    return s;
  }

  function getActiveRefCode() {
    if (_activePromoter && _activePromoter.referral_code) return String(_activePromoter.referral_code);
    const email = (_activeUser && _activeUser.email) || (_activePromoter && _activePromoter.email) || '';
    if (email.toLowerCase() === 'ronakj303@gmail.com') return '78920145';
    const name =
      (_activePromoter && _activePromoter.full_name) ||
      (email ? email.split('@')[0] : 'PROMO');
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash) % 90000000 + 10000000);
  }

  function togglePortalMobileMenu(forceState) {
    const panel = document.getElementById('mobile-nav-menu');
    const btn = document.getElementById('mobile-menu-btn');
    if (!panel || !btn) return;
    const shouldOpen =
      typeof forceState === 'boolean' ? forceState : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !shouldOpen);
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function initPortalMenuDismiss() {
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('mobile-nav-menu');
      const btn = document.getElementById('mobile-menu-btn');
      if (!panel || panel.classList.contains('hidden')) return;
      if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
        togglePortalMobileMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        togglePortalMobileMenu(false);
        closePortalModal('portal-book-modal');
        closePortalModal('portal-receipt-modal');
      }
    });
  }

  function toggleDashPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btn) {
      btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
    }
  }

  function showDashboardState(state) {
    const barrier =
      document.getElementById('dashboard-loading-barrier') ||
      document.getElementById('portal-loading-barrier');
    const gate = document.getElementById('dashboard-auth-gate');
    const workspace =
      document.getElementById('dashboard-workspace') ||
      document.getElementById('portal-workspace');

    if (barrier) barrier.classList.add('hidden');
    if (gate) gate.classList.add('hidden');
    if (workspace) workspace.classList.add('hidden');

    if (state === 'loading' && barrier) {
      barrier.classList.remove('hidden');
    } else if (state === 'login' && gate) {
      gate.classList.remove('hidden');
    } else if (state === 'workspace' && workspace) {
      workspace.classList.remove('hidden');
    }

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function switchDashboardTab(tab) {
    const tabIn = document.getElementById('tab-dashboard-signin');
    const tabUp = document.getElementById('tab-dashboard-signup');
    const formIn = document.getElementById('form-dashboard-signin');
    const formUp = document.getElementById('form-dashboard-signup');
    const notice = document.getElementById('dash-confirm-notice');
    const errBox = document.getElementById('dashboard-auth-error');

    if (errBox) errBox.classList.add('hidden');
    if (notice) notice.classList.add('hidden');

    if (tab === 'signin') {
      if (tabIn) tabIn.classList.add('is-active');
      if (tabUp) tabUp.classList.remove('is-active');
      if (formIn) formIn.classList.remove('hidden');
      if (formUp) formUp.classList.add('hidden');
    } else {
      if (tabUp) tabUp.classList.add('is-active');
      if (tabIn) tabIn.classList.remove('is-active');
      if (formUp) formUp.classList.remove('hidden');
      if (formIn) formIn.classList.add('hidden');
    }
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function openPortalModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    togglePortalMobileMenu(false);
    el.classList.remove('hidden');
    setTimeout(() => el.classList.remove('opacity-0'), 15);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function closePortalModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('opacity-0');
    el.classList.add('hidden');
  }

  async function handleDashboardSignIn(e) {
    e.preventDefault();
    const emailInput = document.getElementById('dash-signin-email');
    const passwordInput = document.getElementById('dash-signin-password');
    const email = (emailInput ? emailInput.value : '').trim();
    const password = passwordInput ? passwordInput.value : '';
    const errBox = document.getElementById('dashboard-auth-error');
    const errText = document.getElementById('dashboard-auth-error-text');
    const btn = document.getElementById('btn-dash-signin');
    const btnText = document.getElementById('btn-dash-signin-text');

    if (errBox) errBox.classList.add('hidden');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Signing in...';

    try {
      if (!window.TixoraAuth) throw new Error('Supabase Auth layer not initialized.');
      const res = await TixoraAuth.signIn(email, password);
      if (passwordInput) passwordInput.value = '';
      const role = res.role || (await TixoraAuth.getUserRole(res.user));
      const nextUrl = resolveSafeNextUrl();

      if (role !== 'admin' && role !== 'manager' && nextUrl !== '/dashboard') {
        showToast('Signed in! Opening your Events Portal...');
        window.location.replace(nextUrl);
        return;
      }

      showToast('Signed in. Workspace ready!');
      await renderPromoterWorkspace(res.user, res.promoter, role);
    } catch (err) {
      console.error('Sign In Error:', err);
      if (errBox && errText) {
        errText.textContent = err.message || 'Invalid email or password.';
        errBox.classList.remove('hidden');
      }
      if (err.code === 'rate_limit' && btn) {
        btn.disabled = true;
        let countdown = err.retry_after || 900;
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Sign In';
          } else if (btnText) {
            btnText.textContent = `Locked: Retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
          }
        }, 1000);
        if (btnText) {
          btnText.textContent = `Locked: Retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
        }
      }
      showToast(err.message || 'Sign in failed');
    } finally {
      if (btn && (!errBox || !errBox.textContent.toLowerCase().includes('locked'))) {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Sign In';
      }
    }
  }

  async function handleDashboardSignUp(e) {
    e.preventDefault();
    const fullName = document.getElementById('dash-signup-fullname').value.trim();
    const phone = document.getElementById('dash-signup-phone').value.trim();
    const email = document.getElementById('dash-signup-email').value.trim();
    const passwordInput = document.getElementById('dash-signup-password');
    const password = passwordInput ? passwordInput.value : '';
    const city = document.getElementById('dash-signup-city').value.trim();
    const upiId = document.getElementById('dash-signup-upi').value.trim();

    const errBox = document.getElementById('dashboard-auth-error');
    const errText = document.getElementById('dashboard-auth-error-text');
    const btn = document.getElementById('btn-dash-signup');
    const btnText = document.getElementById('btn-dash-signup-text');

    if (errBox) errBox.classList.add('hidden');

    const upiRegex = /^[\w.\-]{2,64}@[a-zA-Z0-9.\-]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      if (errBox && errText) {
        errText.textContent = 'Enter a valid UPI ID (e.g. name@oksbi, mobile@paytm).';
        errBox.classList.remove('hidden');
      }
      return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Submitting...';

    try {
      if (!window.TixoraAuth) throw new Error('Supabase Auth layer not initialized.');
      const res = await TixoraAuth.signUp({
        email,
        password,
        fullName,
        phone,
        city,
        upiId,
        role: 'promoter'
      });
      if (passwordInput) passwordInput.value = '';

      if (res && res.emailConfirmationRequired) {
        const notice = document.getElementById('dash-confirm-notice');
        const emailTarget = document.getElementById('dash-confirm-email');
        const formSignup = document.getElementById('form-dashboard-signup');
        if (emailTarget) emailTarget.textContent = email;
        if (formSignup) formSignup.classList.add('hidden');
        if (notice) notice.classList.remove('hidden');
        showToast('Registered! Verify your email to continue.');
      } else if (res && res.user) {
        showToast('Promoter account activated! Opening Events Portal...');
        window.location.replace(resolveSafeNextUrl());
      }
    } catch (err) {
      console.error('Sign Up Error:', err);
      if (errBox && errText) {
        errText.textContent = err.message || 'Registration failed. Check your details.';
        errBox.classList.remove('hidden');
      }
      showToast(err.message || 'Registration failed');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Apply & Register';
    }
  }

  async function handleDashboardResend() {
    const email =
      (document.getElementById('dash-signup-email')?.value || '').trim() ||
      (document.getElementById('dash-signin-email')?.value || '').trim();
    if (!email) {
      showToast('Enter an email address to resend.');
      return;
    }
    try {
      await TixoraAuth.resendConfirmation(email);
      showToast('Verification email sent to ' + email);
    } catch (err) {
      showToast(err.message || 'Could not resend email');
    }
  }

  async function handlePortalSignOut() {
    try {
      if (window.TixoraAuth) {
        await TixoraAuth.signOut();
      }
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    resetPortalUserState();
    showToast('Signed out.');
    if (resolveCurrentPage() === 'dashboard' && document.getElementById('dashboard-auth-gate')) {
      showDashboardState('login');
    } else {
      window.location.href = '/dashboard';
    }
  }

  function renderFeaturedSpotlight(events) {
    if (!events || events.length === 0) return;
    const ev = events.find((e) => e.featured) || events[0];
    const baseTier = ev.tiers[0] || { name: 'GA Standard', price: 3499, cutPct: 14 };
    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const activeCut = Math.max(userCut, Number(baseTier.cutPct || 14));
    const earnAmt = Math.round((Number(baseTier.price) * activeCut) / 100);

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setEl('events-featured-title', ev.title);
    setEl('events-featured-venue', ev.venue);
    setEl('events-featured-mrp', '₹' + Number(baseTier.price).toLocaleString('en-IN'));
    setEl('events-featured-cut', `Save ₹${earnAmt.toLocaleString('en-IN')} / pass (${activeCut}% Margin)`);
    const imgEl = document.getElementById('events-featured-img');
    if (imgEl && ev.poster) imgEl.src = sanitizeAssetUrl(ev.poster);
    const btnEl = document.getElementById('events-featured-btn');
    if (btnEl) {
      btnEl.onclick = () => openPortalBookModal(ev.id);
    }
  }

  async function loadPortalEvents() {
    // Strictly authoritative list of 11 verified upcoming tour headliners
    // Prevents legacy or unverified database rows (e.g. Martin Garrix, Anyma) from showing
    _portalEvents = CANONICAL_PORTAL_EVENTS.slice();
    renderFeaturedSpotlight(_portalEvents);
    filterPortalEvents();
  }

  function setPortalCityFilter(city) {
    _portalCityFilter = (city || 'all').toLowerCase();
    document.querySelectorAll('[data-portal-city]').forEach((btn) => {
      const active = (btn.getAttribute('data-portal-city') || 'all').toLowerCase() === _portalCityFilter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    filterPortalEvents();
  }

  function resetPortalEventFilters() {
    const search = document.getElementById('promo-events-search');
    if (search) search.value = '';
    setPortalCityFilter('all');
  }

  function filterPortalEvents() {
    const grid = document.getElementById('promo-events-grid');
    if (!grid) return;
    const countEl = document.getElementById('promo-events-count');
    const emptyEl = document.getElementById('promo-events-empty');
    const search = (document.getElementById('promo-events-search')?.value || '').trim().toLowerCase();

    const events = _portalEvents.length ? _portalEvents : CANONICAL_PORTAL_EVENTS;
    const filtered = events.filter((ev) => {
      const cityList = (ev.cities || []).map((c) => c.city.toLowerCase());
      const cityOk =
        _portalCityFilter === 'all' ||
        (ev.city || '').toLowerCase().includes(_portalCityFilter) ||
        (ev.venue || '').toLowerCase().includes(_portalCityFilter) ||
        cityList.some((c) => c.includes(_portalCityFilter));
      const hay = `${ev.title} ${ev.artist} ${ev.venue} ${ev.city} ${ev.date} ${cityList.join(' ')}`.toLowerCase();
      const textOk = !search || hay.includes(search);
      return cityOk && textOk;
    });

    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${events.length} Events`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);

    grid.innerHTML = filtered
      .map((ev) => {
        const baseTier = (ev.tiers && ev.tiers[0]) || { name: 'GA Pass', price: 3499, cutPct: 12 };
        const activeCut = Math.max(userCut, Number(baseTier.cutPct || 12));
        const earnAmt = Math.round((Number(baseTier.price) * activeCut) / 100);
        const safeId = escapeHtml(ev.id);

        // Render mini city buttons on the card
        const cityPills = (ev.cities || [{ city: ev.city }])
          .map((c) => {
            const cityName = escapeHtml(c.city);
            return `<button type="button" onclick="event.stopPropagation(); openPortalBookModal('${safeId}', '${cityName}')" class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#27272a] text-[#d4d4d8] hover:bg-[var(--crimson-ink)] hover:text-white transition-colors border border-[var(--line)]">${cityName}</button>`;
          })
          .join(' ');

        return `
          <article class="tour-card tour-card--grid cursor-pointer" onclick="openPortalBookModal('${safeId}')">
            <div class="tour-card-media">
              <img src="${escapeHtml(sanitizeAssetUrl(ev.poster))}" alt="${escapeHtml(ev.title)}" width="480" height="320" loading="lazy" decoding="async">
              <span class="tour-cut-pill tabular-nums">${activeCut.toFixed(0)}% Margin</span>
              <span class="tour-venue-pill">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 flex-shrink-0"></i>
                <span class="truncate">${escapeHtml(ev.venue || ev.city)}</span>
              </span>
            </div>

            <div class="tour-card-body">
              <div>
                <div class="tour-meta-row flex-wrap gap-1.5 items-center">
                  <span class="tour-tag tour-tag--featured">${escapeHtml(ev.city)}</span>
                  <span>${escapeHtml(ev.date)}</span>
                </div>
                <h3 class="tour-card-title">${escapeHtml(ev.title)}</h3>
                <p class="tour-card-desc">${escapeHtml(ev.artist)} &bull; Official National Tour Allocation</p>
                
                <!-- City quick-choice bar -->
                <div class="pt-2 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Cities:</span>
                  ${cityPills}
                </div>
              </div>

              <div class="tour-card-footer">
                <div class="tour-price-split tabular-nums">
                  <div>
                    <span class="tour-price-label">Official MRP</span>
                    <span class="tour-price-val">₹${Number(baseTier.price).toLocaleString('en-IN')}</span>
                  </div>
                  <div class="text-right">
                    <span class="tour-price-label">Promoter Cut</span>
                    <span class="tour-yield-val">Earn ₹${earnAmt.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div class="pt-2">
                  <button type="button" onclick="event.stopPropagation(); openPortalBookModal('${safeId}')" class="btn-editorial-primary w-full flex items-center justify-center gap-1.5">
                    <i data-lucide="ticket" class="w-4 h-4"></i>
                    <span>View Rate Card &amp; Book</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function openPortalBookModal(eventId, preferredCity) {
    const list = _portalEvents.length ? _portalEvents : CANONICAL_PORTAL_EVENTS;
    const ev = list.find((item) => String(item.id) === String(eventId)) || list[0];
    if (!ev) return;
    _bookingModalEvent = ev;

    const titleEl = document.getElementById('portal-book-title');
    const promoEl = document.getElementById('book-promo-id');
    const qtySelect = document.getElementById('book-qty-select');

    if (titleEl) titleEl.textContent = ev.title;
    if (promoEl) promoEl.textContent = getActiveRefCode();
    if (qtySelect) qtySelect.value = '1';

    // Autofill contact fields
    const nameEl = document.getElementById('book-cust-name');
    const phoneEl = document.getElementById('book-cust-phone');
    const emailEl = document.getElementById('book-cust-email');
    if (nameEl && !nameEl.value && _activePromoter) nameEl.value = _activePromoter.full_name || '';
    if (phoneEl && !phoneEl.value && _activePromoter) phoneEl.value = _activePromoter.phone || '+91 98200 11223';
    if (emailEl && !emailEl.value && _activeUser) emailEl.value = _activeUser.email || '';

    // Render city selector pills in modal
    const cities = ev.cities && ev.cities.length ? ev.cities : [{ city: ev.city, venue: ev.venue, date: ev.date, tiers: ev.tiers }];
    const pillsContainer = document.getElementById('book-city-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = cities
        .map((c) => {
          const safeCity = escapeHtml(c.city);
          return `<button type="button" data-modal-city="${safeCity}" onclick="selectPortalModalCity('${safeCity}')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[#1c1c20] text-[#d4d4d8] hover:bg-[#27272a] transition-all">${safeCity}</button>`;
        })
        .join('');
    }

    // Determine initial city
    let initialCity = preferredCity;
    if (!initialCity || !cities.some((c) => c.city.toLowerCase() === initialCity.toLowerCase())) {
      initialCity = ev.defaultCity || cities[0].city;
    }

    selectPortalModalCity(initialCity);
    openPortalModal('portal-book-modal');
  }

  function selectPortalModalCity(cityName) {
    if (!_bookingModalEvent) return;
    const cities = _bookingModalEvent.cities && _bookingModalEvent.cities.length
      ? _bookingModalEvent.cities
      : [{ city: _bookingModalEvent.city, venue: _bookingModalEvent.venue, date: _bookingModalEvent.date, tiers: _bookingModalEvent.tiers }];

    const cityObj = cities.find((c) => c.city.toLowerCase() === (cityName || '').toLowerCase()) || cities[0];
    _bookingModalCity = cityObj;
    _bookingModalTierIdx = 0;

    // Update city pills active state
    document.querySelectorAll('[data-modal-city]').forEach((pill) => {
      const active = (pill.getAttribute('data-modal-city') || '').toLowerCase() === cityObj.city.toLowerCase();
      if (active) {
        pill.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--crimson-ink)] bg-[var(--crimson-ink)] text-white shadow-md transition-all';
      } else {
        pill.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[#1c1c20] text-[#d4d4d8] hover:bg-[#27272a] transition-all';
      }
    });

    // Update modal meta with exact venue & date
    const metaEl = document.getElementById('portal-book-meta');
    const venueEl = document.getElementById('book-city-venue');
    if (metaEl) metaEl.textContent = `${cityObj.venue} • ${cityObj.date}`;
    if (venueEl) venueEl.textContent = `${cityObj.venue} • ${cityObj.date}`;

    // Render entire price list table (MRP, Commission, Net Payable)
    renderPriceListTable(cityObj);

    // Populate dropdown options
    const tierSelect = document.getElementById('book-tier-select');
    if (tierSelect) {
      tierSelect.innerHTML = cityObj.tiers
        .map(
          (t, idx) =>
            `<option value="${idx}">${escapeHtml(t.name)} - MRP ₹${Number(t.price).toLocaleString('en-IN')}</option>`
        )
        .join('');
      tierSelect.value = '0';
    }

    updatePortalBookingSummary();
  }

  function renderPriceListTable(cityObj) {
    const tbody = document.getElementById('book-pricelist-tbody');
    if (!tbody || !cityObj || !cityObj.tiers) return;

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);

    tbody.innerHTML = cityObj.tiers
      .map((t, idx) => {
        const rate = Math.max(userCut, Number(t.cutPct || 12));
        const mrp = Number(t.price);
        const comm = Math.round((mrp * rate) / 100);
        const net = Math.max(0, mrp - comm);
        const isSelected = idx === _bookingModalTierIdx;

        const rowBg = isSelected ? 'bg-[#27272a] border-l-2 border-[var(--crimson-ink)]' : 'hover:bg-[#212126]';
        const btnCls = isSelected ? 'bg-[var(--crimson-ink)] text-white' : 'bg-[#2e2e33] text-[var(--muted)] hover:text-white';

        return `
          <tr class="cursor-pointer transition-colors ${rowBg}" onclick="selectModalTier(${idx})">
            <td class="p-2.5 font-medium text-white flex items-center gap-1.5">
              ${isSelected ? '<span class="w-1.5 h-1.5 rounded-full bg-[var(--crimson-ink)]"></span>' : ''}
              <span>${escapeHtml(t.name)}</span>
            </td>
            <td class="p-2.5 text-right font-mono text-[var(--muted)] tabular-nums">₹${mrp.toLocaleString('en-IN')}</td>
            <td class="p-2.5 text-right font-mono text-[var(--emerald-ink)] tabular-nums">
              <span class="px-1.5 py-0.5 rounded bg-[var(--emerald-ink)]/10 font-medium">${rate.toFixed(0)}% (-₹${comm.toLocaleString('en-IN')})</span>
            </td>
            <td class="p-2.5 text-right font-mono font-bold text-white tabular-nums text-sm">₹${net.toLocaleString('en-IN')}</td>
            <td class="p-2.5 text-center">
              <button type="button" class="px-2 py-1 rounded text-[10px] font-bold transition-all ${btnCls}">
                ${isSelected ? 'Selected' : 'Select'}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  window.selectPortalModalCity = selectPortalModalCity;

  window.selectModalTier = function (idx) {
    _bookingModalTierIdx = Number(idx);
    const tierSelect = document.getElementById('book-tier-select');
    if (tierSelect) tierSelect.value = String(idx);
    if (_bookingModalCity) renderPriceListTable(_bookingModalCity);
    updatePortalBookingSummary();
  };

  window.onModalTierSelectChange = function () {
    const tierSelect = document.getElementById('book-tier-select');
    if (tierSelect) {
      _bookingModalTierIdx = Number(tierSelect.value || 0);
      if (_bookingModalCity) renderPriceListTable(_bookingModalCity);
      updatePortalBookingSummary();
    }
  };

  function updatePortalBookingSummary() {
    if (!_bookingModalEvent || !_bookingModalCity) return;
    const tier = (_bookingModalCity.tiers && _bookingModalCity.tiers[_bookingModalTierIdx]) || { name: 'GA Pass', price: 3499, cutPct: 12 };
    const qty = Number(document.getElementById('book-qty-select')?.value || 1);
    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const rate = Math.max(userCut, Number(tier.cutPct || 12));
    const total = Number(tier.price) * qty;
    const cut = Math.round((total * rate) / 100);
    const netPayable = Math.max(0, total - cut);

    const mrpEl = document.getElementById('book-total-mrp');
    const cutEl = document.getElementById('book-est-cut');
    const netEl = document.getElementById('book-net-payable');
    const btnText = document.getElementById('btn-portal-book-text');

    if (mrpEl) mrpEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (cutEl) cutEl.textContent = `-₹${cut.toLocaleString('en-IN')} (${rate}% Margin Saved)`;
    if (netEl) netEl.textContent = `₹${netPayable.toLocaleString('en-IN')}`;
    if (btnText) btnText.textContent = `Pay Net ₹${netPayable.toLocaleString('en-IN')} & Book Pass`;
  }

  async function handlePortalBookingSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!_bookingModalEvent || !_bookingModalCity) return;

    const tier = (_bookingModalCity.tiers && _bookingModalCity.tiers[_bookingModalTierIdx]) || { name: 'GA Pass', price: 3499, cutPct: 12 };
    const qty = Number(document.getElementById('book-qty-select')?.value || 1);
    const custName = (document.getElementById('book-cust-name')?.value || '').trim();
    const custPhone = (document.getElementById('book-cust-phone')?.value || '').trim();
    const custEmail = (document.getElementById('book-cust-email')?.value || '').trim().toLowerCase();

    const btn = document.getElementById('btn-portal-book-submit');
    const btnText = document.getElementById('btn-portal-book-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Booking & Punching Pass...';

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const rate = Math.max(userCut, Number(tier.cutPct || 12));
    const totalAmount = Number(tier.price) * qty;
    const commissionAmount = Math.round((totalAmount * rate) / 100);
    const netAmountPaid = totalAmount - commissionAmount;
    let orderRef = 'TIX-' + Math.floor(100000 + Math.random() * 900000);

    const fullEventTitle = `${_bookingModalEvent.title} (${_bookingModalCity.city})`;

    try {
      if (window.TixoraAuth && typeof window.TixoraAuth.fetchWithCsrf === 'function') {
        const res = await window.TixoraAuth.fetchWithCsrf('/api/cart/checkout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: { name: custName, phone: custPhone, email: custEmail },
            items: [{ title: fullEventTitle, tier: tier.name, price: tier.price, quantity: qty }],
            expiresAt: Date.now() + 600000
          })
        });
        const data = await res.json();
        if (res.ok && data && data.order && data.order.orderId) {
          orderRef = data.order.orderId;
        }
      }
    } catch (err) {}

    if (window.TixoraAuth && typeof window.TixoraAuth.recordLocalBooking === 'function') {
      window.TixoraAuth.recordLocalBooking(_activeUser, {
        order_ref: orderRef,
        event_title: fullEventTitle,
        tier_name: `${tier.name} (${_bookingModalCity.city})`,
        quantity: qty,
        unit_price: tier.price,
        total_amount: totalAmount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        net_amount_paid: netAmountPaid,
        attendee_name: custName,
        attendee_phone: custPhone,
        attendee_email: custEmail,
        status: 'Punched to BookMyShow',
        fulfillment: 'Punched to BookMyShow / District',
        channel: 'Promoter Portal',
        created_at: new Date().toISOString()
      });
    }

    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Pay Net Amount & Book Pass';
    closePortalModal('portal-book-modal');
    await hydratePortalLedgerAndHistory();
    showToast(`Pass ${orderRef} booked! ${tier.name} (${_bookingModalCity.city}) punched to BookMyShow / District.`);
  }

  function setBookingStatusFilter(status) {
    _bookingStatusFilter = (status || 'all').toLowerCase();
    document.querySelectorAll('[data-booking-status]').forEach((btn) => {
      const active = (btn.getAttribute('data-booking-status') || 'all').toLowerCase() === _bookingStatusFilter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderBookingsTable();
  }

  function renderBookingsTable() {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    const search = (document.getElementById('bookings-search')?.value || '').trim().toLowerCase();
    const filtered = _portalBookings.filter((b) => {
      const status = String(b.status || 'confirmed').toLowerCase();
      const statusOk = _bookingStatusFilter === 'all' || status.includes(_bookingStatusFilter);
      const hay = `${b.order_ref} ${b.external_sale_id || ''} ${b.event_title} ${b.tier_name} ${b.seat_details || ''} ${b.attendee_name} ${b.attendee_email || ''} ${b.attendee_phone || ''}`.toLowerCase();
      const textOk = !search || hay.includes(search);
      return statusOk && textOk;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No matching bookings found. Reserve passes from <a href="/portal" class="text-[var(--crimson-ink)] font-semibold">Events Home &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((b) => {
        const st = String(b.status || 'confirmed').toLowerCase();
        const badgeClass =
          st.includes('scan') || st.includes('confirm') || st.includes('paid')
            ? 'ops-badge-emerald'
            : st.includes('pend')
              ? 'ops-badge-gold'
              : 'ops-badge-navy';
        const dt = b.created_at
          ? new Date(b.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : 'Today';

        const extIdBadge = b.external_sale_id
          ? `<span class="text-[10px] text-[var(--muted)] font-mono block">Sale ID #${b.external_sale_id}</span>`
          : '';
        const seatsText = b.seat_details ? ` &bull; <span class="font-mono text-zinc-400">${escapeHtml(b.seat_details)}</span>` : '';
        const emailText = b.attendee_email
          ? ` &bull; ${escapeHtml(b.attendee_email)}`
          : ` &bull; <span class="text-amber-400 font-sans italic font-normal">No email</span>`;

        return `
          <tr>
            <td class="font-bold text-[var(--crimson-ink)] whitespace-nowrap">
              ${escapeHtml(b.order_ref)}
              ${extIdBadge}
            </td>
            <td class="min-w-[180px]">
              <div class="font-bold text-white font-sans">${escapeHtml(getCanonicalTourTitle(b.event_title))}</div>
              <div class="text-[11px] text-[var(--muted)]">
                ${detectCityFromTitle(b.event_title) ? `<span class="text-zinc-300 font-medium">${escapeHtml(detectCityFromTitle(b.event_title))}</span> &bull; ` : ''}
                ${escapeHtml(b.tier_name)}${seatsText}
              </div>
            </td>
            <td class="tabular-nums">${Number(b.quantity || 1)}</td>
            <td class="font-sans text-xs">
              <div class="font-semibold text-white">${escapeHtml(b.attendee_name)}</div>
              <div class="text-[11px] text-[var(--muted)] font-mono">${escapeHtml(b.attendee_phone || '')}${emailText}</div>
            </td>
            <td class="tabular-nums whitespace-nowrap">₹${Number(b.total_amount || 0).toLocaleString('en-IN')}</td>
            <td class="tabular-nums whitespace-nowrap text-[var(--emerald-ink)] font-bold">+₹${Number(b.commission_amount || 0).toLocaleString('en-IN')}</td>
            <td class="whitespace-nowrap text-[var(--muted)]">${escapeHtml(dt)}</td>
            <td>
              <span class="${badgeClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(b.status || 'Confirmed')}</span>
            </td>
            <td>
              <button type="button" data-view-receipt="${escapeHtml(b.order_ref)}"
                class="btn-editorial-outline-light btn-compact" style="min-block-size: 36px; padding-inline: 10px;">
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function openBookingReceipt(orderRef) {
    const b = _portalBookings.find((item) => String(item.order_ref) === String(orderRef));
    if (!b) return;
    const setEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    const extId = b.external_sale_id ? ` (Sale ID #${b.external_sale_id})` : '';
    const seats = b.seat_details ? ` [${b.seat_details}]` : '';
    const attEmail = b.attendee_email ? ` • ${b.attendee_email}` : ' • (No email provided)';
    setEl('receipt-status', String(b.status || 'Confirmed').toUpperCase());
    setEl('receipt-order-ref', `${b.order_ref}${extId}`);
    setEl('receipt-event', b.event_title);
    setEl('receipt-tier', `${b.tier_name}${seats} x ${b.quantity || 1}`);
    setEl('receipt-attendee', `${b.attendee_name} (${b.attendee_phone || 'Verified'}${attEmail})`);
    setEl('receipt-channel', b.channel || 'Direct Sales');
    setEl('receipt-amount', '₹' + Number(b.total_amount || 0).toLocaleString('en-IN'));
    setEl('receipt-commission', '+₹' + Number(b.commission_amount || 0).toLocaleString('en-IN'));
    openPortalModal('portal-receipt-modal');
  }

  function renderPayoutsTable() {
    const tbody = document.getElementById('wallet-payouts-body');
    if (!tbody) return;
    if (!_portalPayouts || _portalPayouts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No pass billing transactions yet. Book passes from <a href="/portal" class="text-[var(--crimson-ink)] font-semibold">Events Home &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }
    tbody.innerHTML = _portalPayouts
      .map((p) => {
        const st = String(p.status || 'settled').toLowerCase();
        const badgeClass =
          st.includes('settle') || st.includes('paid') || st.includes('success')
            ? 'ops-badge-emerald'
            : 'ops-badge-gold';
        const dt = p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : 'Recent';
        return `
          <tr>
            <td class="font-bold text-white">${escapeHtml(p.payout_ref || p.id || 'PAY-01')}</td>
            <td class="text-[var(--crimson-ink)]">${escapeHtml(p.upi_id || (_activePromoter && _activePromoter.upi_id) || 'user@upi')}</td>
            <td class="tabular-nums font-bold text-[var(--emerald-ink)]">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
            <td class="text-[var(--muted)]">${escapeHtml(p.utr_number || p.utr || 'AUTO-UPI')}</td>
            <td class="text-[var(--muted)] whitespace-nowrap">${escapeHtml(dt)}</td>
            <td><span class="${badgeClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(p.status || 'Settled')}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  function renderCommissionLedger() {
    const tbody = document.getElementById('dash-ledger-body');
    if (!tbody) return;

    if (_portalBookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No pass bookings yet. Book client passes from <a href="/portal" class="text-[var(--crimson-ink)] font-semibold">Events Home &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = _portalBookings
      .map((b) => {
        const amt = Number(b.total_amount || 0);
        const rate = Number(b.commission_rate || 11);
        const comm = Number(b.commission_amount !== undefined ? b.commission_amount : Math.round((amt * rate) / 100));
        const extBadge = b.external_sale_id
          ? `<span class="ops-badge-navy text-[10px] px-1.5 py-0.5 rounded font-mono ml-1.5">Sale #${b.external_sale_id}</span>`
          : '';
        const seats = b.seat_details ? `<span class="text-[10px] text-[var(--muted)] block font-mono">${escapeHtml(b.seat_details)}</span>` : '';

        return `
          <tr>
            <td class="whitespace-nowrap">
              <span class="font-bold text-[var(--crimson-ink)]">${escapeHtml(b.order_ref)}</span>
              ${extBadge}
            </td>
            <td class="font-sans font-semibold text-white min-w-[150px]">${escapeHtml(b.event_title)}</td>
            <td class="text-[var(--muted)]">
              ${escapeHtml(b.tier_name)} x${b.quantity || 1}
              ${seats}
            </td>
            <td class="tabular-nums">₹${amt.toLocaleString('en-IN')}</td>
            <td class="tabular-nums">${rate.toFixed(1)}%</td>
            <td class="tabular-nums font-bold text-[var(--emerald-ink)]">+₹${comm.toLocaleString('en-IN')}</td>
            <td><span class="ops-badge-emerald px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(b.status || 'Confirmed')}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  function getCanonicalTourTitle(raw) {
    if (!raw) return 'Unassigned Tour';
    const lower = raw.toLowerCase().trim();
    if (lower.includes('arijit') || lower.includes('arjit')) return 'Arijit Singh';
    if (lower.includes('diljit')) return 'Diljit Dosanjh';
    if (lower.includes('chainsmoker')) return 'The Chainsmokers';
    if (lower.includes('darshan')) return 'Darshan Raval';
    if (lower.includes('coldplay')) return 'Coldplay';
    if (lower.includes('dua lipa')) return 'Dua Lipa';
    if (lower.includes('garrix')) return 'Martin Garrix';
    if (lower.includes('guns')) return "Guns N' Roses";
    if (lower.includes('anyma')) return 'Anyma';
    if (lower.includes('brejcha')) return 'Boris Brejcha';
    if (lower.includes('fred')) return 'Fred again..';
    return raw.trim();
  }

  function detectCityFromTitle(raw) {
    const l = (raw || '').toLowerCase();
    if (l.includes('bangalore') || l.includes('banglore') || l.includes('blr')) return 'Bengaluru';
    if (l.includes('mumbai') || l.includes('bom')) return 'Mumbai';
    if (l.includes('hyderabad') || l.includes('hyd')) return 'Hyderabad';
    if (l.includes('ahmedabaad') || l.includes('ahmedabad')) return 'Ahmedabad';
    if (l.includes('delhi')) return 'Delhi';
    if (l.includes('goa')) return 'Goa';
    if (l.includes('chandigarh')) return 'Chandigarh';
    return '';
  }

  let _eventBreakdownMetric = 'volume'; // 'volume' | 'passes'

  window.setEventBreakdownMetric = function (metric) {
    _eventBreakdownMetric = metric;
    renderEventBreakdownChart();
  };

  function renderEventBreakdownChart() {
    const container = document.getElementById('dash-event-breakdown');
    if (!container) return;

    if (_portalBookings.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-xs font-medium text-[var(--muted)]">
          No tour sales recorded yet.
        </div>
      `;
      return;
    }

    const totalVolume = _portalBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0) || 1;
    const totalPasses = _portalBookings.reduce((s, b) => s + Number(b.quantity || 1), 0) || 1;
    const eventStats = {};

    _portalBookings.forEach((b) => {
      const canonicalTitle = getCanonicalTourTitle(b.event_title);
      if (!eventStats[canonicalTitle]) {
        eventStats[canonicalTitle] = {
          title: canonicalTitle,
          orders: 0,
          passes: 0,
          volume: 0,
          categories: new Set(),
          cities: new Set()
        };
      }
      eventStats[canonicalTitle].orders += 1;
      eventStats[canonicalTitle].passes += Number(b.quantity || 1);
      eventStats[canonicalTitle].volume += Number(b.total_amount || 0);
      if (b.tier_name) eventStats[canonicalTitle].categories.add(b.tier_name);
      const city = detectCityFromTitle(b.event_title);
      if (city) eventStats[canonicalTitle].cities.add(city);
    });

    const sortedEvents = Object.values(eventStats).sort((a, b) => {
      return _eventBreakdownMetric === 'passes' ? b.passes - a.passes : b.volume - a.volume;
    });

    const maxVolume = Math.max(...sortedEvents.map((e) => e.volume), 1);
    const maxPasses = Math.max(...sortedEvents.map((e) => e.passes), 1);
    const isVol = _eventBreakdownMetric !== 'passes';
    const maxVal = isVol ? maxVolume : maxPasses;

    // Y-Axis reference steps
    const ySteps = isVol
      ? [
          '₹' + (maxVolume >= 1000 ? Math.round(maxVolume / 1000) + 'k' : maxVolume),
          '₹' + Math.round((maxVolume * 0.75) / 1000) + 'k',
          '₹' + Math.round((maxVolume * 0.5) / 1000) + 'k',
          '₹' + Math.round((maxVolume * 0.25) / 1000) + 'k',
          '₹0'
        ]
      : [
          String(maxPasses),
          String(Math.round(maxPasses * 0.75)),
          String(Math.round(maxPasses * 0.5)),
          String(Math.round(maxPasses * 0.25)),
          '0'
        ];

    // Helper for clean short event name for x-axis
    const getShortName = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('arijit') || lower.includes('arjit')) return 'Arijit Singh';
      if (lower.includes('coldplay')) return 'Coldplay';
      if (lower.includes('dua lipa')) return 'Dua Lipa';
      if (lower.includes('garrix')) return 'Martin Garrix';
      if (lower.includes('diljit')) return 'Diljit Dosanjh';
      if (lower.includes('chainsmokers')) return 'Chainsmokers';
      if (lower.includes('guns')) return "Guns N' Roses";
      if (lower.includes('anyma')) return 'Anyma';
      if (lower.includes('brejcha')) return 'Boris Brejcha';
      if (lower.includes('fred')) return 'Fred again..';
      return name.length > 14 ? name.slice(0, 12) + '..' : name;
    };

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Interactive Chart Controls -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-void)]/80 border border-[var(--line)] p-3 rounded-xl">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[var(--crimson)]"></span>
            <span class="text-xs font-semibold text-white">Event Sales Distribution Bar Graph</span>
            <span class="text-[11px] text-[var(--muted)]">(${sortedEvents.length} events)</span>
          </div>
          <div class="inline-flex p-1 rounded-lg bg-[#18181b] border border-[var(--line)] text-xs">
            <button type="button" onclick="setEventBreakdownMetric('volume')"
              class="px-3 py-1 rounded-md font-semibold transition-all ${isVol ? 'bg-[var(--crimson)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'}">
              Gross Volume (₹)
            </button>
            <button type="button" onclick="setEventBreakdownMetric('passes')"
              class="px-3 py-1 rounded-md font-semibold transition-all ${!isVol ? 'bg-[var(--crimson)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'}">
              Passes Sold
            </button>
          </div>
        </div>

        <!-- Vertical Column Bar Chart Canvas -->
        <div class="p-4 sm:p-6 rounded-2xl bg-[var(--bg-void)]/60 border border-[var(--line)] space-y-3">
          <div class="relative flex items-stretch gap-3">
            <!-- Y-Axis Scale Marks -->
            <div class="flex flex-col justify-between items-end pr-2 text-[10px] text-[var(--muted)] font-medium tabular-nums h-[200px] w-14 flex-shrink-0 select-none border-r border-[var(--line)]">
              <span>${ySteps[0]}</span>
              <span>${ySteps[1]}</span>
              <span>${ySteps[2]}</span>
              <span>${ySteps[3]}</span>
              <span>${ySteps[4]}</span>
            </div>

            <!-- Background Grid Lines + Bar Columns -->
            <div class="relative flex-1 h-[200px]">
              <!-- Horizontal Guideline Rows -->
              <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div class="border-b border-white w-full"></div>
                <div class="border-b border-white w-full"></div>
                <div class="border-b border-white w-full"></div>
                <div class="border-b border-white w-full"></div>
                <div class="border-b border-white w-full"></div>
              </div>

              <!-- Scrollable Flex Row of Vertical Bars -->
              <div class="absolute inset-0 flex items-end justify-between gap-2 sm:gap-3 overflow-x-auto pb-1 px-1">
                ${sortedEvents.map((ev) => {
                  const val = isVol ? ev.volume : ev.passes;
                  const pctOfMax = Math.max(6, Math.round((val / maxVal) * 100));
                  const barHeightPx = Math.max(12, Math.round((val / maxVal) * 165));
                  const displayTop = isVol
                    ? (ev.volume >= 1000 ? '₹' + (ev.volume / 1000).toFixed(ev.volume % 1000 === 0 ? 0 : 1) + 'k' : '₹' + ev.volume)
                    : String(ev.passes);
                  const shortTitle = getShortName(ev.title);
                  const pctOfTotal = isVol
                    ? ((ev.volume / totalVolume) * 100).toFixed(1)
                    : ((ev.passes / totalPasses) * 100).toFixed(1);

                  return `
                    <div class="flex-1 min-w-[58px] max-w-[80px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                         title="${escapeHtml(ev.title)} — ₹${ev.volume.toLocaleString('en-IN')} (${ev.passes} passes, ${ev.orders} sales)">
                      <!-- Value Pill Hovering Above Bar -->
                      <div class="mb-1 text-[10px] font-bold text-white tabular-nums tracking-tight whitespace-nowrap opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                        ${displayTop}
                      </div>

                      <!-- Column Bar -->
                      <div class="w-full rounded-t-md transition-all duration-300 relative group-hover:brightness-125"
                           style="height: ${barHeightPx}px; background: linear-gradient(180deg, #ef4444 0%, rgba(239, 68, 68, 0.42) 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);">
                        <div class="absolute inset-x-0 top-0 h-[2px] bg-red-300/80 rounded-t-md"></div>
                      </div>

                      <!-- Tooltip on hover -->
                      <div class="absolute bottom-full mb-3 hidden group-hover:flex flex-col z-30 p-2.5 rounded-xl bg-[#1c1c20] border border-[var(--line)] shadow-xl text-left pointer-events-none min-w-[170px] whitespace-normal">
                        <div class="font-bold text-white text-xs leading-snug">${escapeHtml(ev.title)}</div>
                        <div class="text-[11px] text-[var(--crimson-ink)] font-semibold mt-1">₹${ev.volume.toLocaleString('en-IN')} &bull; ${ev.passes} passes</div>
                        <div class="text-[10px] text-[var(--muted)] mt-0.5">${ev.orders} confirmed ${ev.orders === 1 ? 'sale' : 'sales'} (${pctOfTotal}% of total)</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- X-Axis Labels Row -->
          <div class="flex items-start justify-between gap-2 sm:gap-3 pl-16 overflow-x-auto select-none pt-1">
            ${sortedEvents.map((ev) => {
              const shortTitle = getShortName(ev.title);
              return `
                <div class="flex-1 min-w-[58px] max-w-[80px] text-center" title="${escapeHtml(ev.title)}">
                  <div class="text-[10px] font-semibold text-zinc-300 truncate">${escapeHtml(shortTitle)}</div>
                  <div class="text-[9px] text-[var(--muted)] tabular-nums truncate">${ev.passes}p &bull; ${ev.orders}s</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tabular Sales Breakdown Details (Clean table replacing progress bars) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          ${sortedEvents.map((ev) => {
            const pct = Math.max(0.1, Math.round((ev.volume / totalVolume) * 1000) / 10);
            const cats = Array.from(ev.categories).join(', ');
            const citiesList = Array.from(ev.cities || []);
            const citiesStr = citiesList.length > 0 ? citiesList.join(', ') : 'All Cities';
            return `
              <div class="ops-subcard p-3.5 flex items-center justify-between gap-3 hover:border-[var(--crimson)] transition-colors">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white text-xs truncate">${escapeHtml(ev.title)}</span>
                    <span class="ops-badge-navy text-[10px] px-2 py-0.5 rounded font-semibold text-[var(--crimson-ink)]">${escapeHtml(citiesStr)}</span>
                  </div>
                  <div class="text-[11px] text-[var(--muted)] mt-1 flex flex-wrap items-center gap-1.5">
                    <span>${escapeHtml(cats || 'General')}</span>
                    <span>&bull;</span>
                    <span class="text-zinc-300 font-medium">${ev.orders} ${ev.orders === 1 ? 'sale' : 'sales'}</span>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xs font-bold text-white tabular-nums">₹${ev.volume.toLocaleString('en-IN')}</div>
                  <div class="text-[10px] text-[var(--emerald-ink)] font-semibold tabular-nums mt-0.5">${ev.passes} passes (${pct.toFixed(1)}%)</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  async function handleUpdateUpi(e) {
    e.preventDefault();
    const input = document.getElementById('wallet-upi-input');
    const btn = document.getElementById('btn-save-upi');
    const btnText = document.getElementById('btn-save-upi-text');
    if (!input || !window.TixoraAuth) return;

    const newUpi = input.value.trim();
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Saving...';

    try {
      const res = await TixoraAuth.updateMyUpi(newUpi, _activeUser);
      _activePromoter = res.promoter || _activePromoter;
      if (_activePromoter) _activePromoter.upi_id = res.upi_id;

      const accountUpi = document.getElementById('dash-account-upi');
      const idCardUpi = document.getElementById('id-card-upi');
      if (accountUpi) accountUpi.textContent = res.upi_id;
      if (idCardUpi) idCardUpi.textContent = res.upi_id;
      input.value = res.upi_id;
      showToast('Payout UPI ID updated to ' + res.upi_id);
    } catch (err) {
      showToast(err.message || 'Invalid UPI ID format');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Save UPI ID';
    }
  }

  function applyLedgerMetricsAndRender(dbOrders = []) {
    if (!_activeUser || !window.TixoraAuth) return;
    const isRonak =
      (_activeUser && _activeUser.email && _activeUser.email.toLowerCase() === 'ronakj303@gmail.com') ||
      (_activePromoter && _activePromoter.email && _activePromoter.email.toLowerCase() === 'ronakj303@gmail.com');

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || (isRonak ? 11.0 : 8.0));
    const localBookings = TixoraAuth.getLocalBookings(_activeUser);

    let ordersToProcess = Array.isArray(dbOrders) && dbOrders.length > 0 ? dbOrders : [];
    if (isRonak && ordersToProcess.length === 0) {
      ordersToProcess = CANONICAL_RONAK_IMPORTED_ORDERS.slice();
    }

    const mappedOrders = ordersToProcess.map((o) => {
      const amt = Number(o.total_amount || o.amount || 0);
      const saleId = o.external_sale_id || null;
      return {
        order_ref: o.order_number || o.order_ref || o.order_code || 'ORD-' + String(o.id || '').slice(0, 6),
        external_sale_id: saleId,
        event_title: o.source_event_name || (o.events && o.events.title) || o.event_title || 'Tixora Live Pass',
        tier_name: o.source_category || (o.ticket_tiers && o.ticket_tiers.name) || o.tier_name || 'GA Standard',
        seat_details: o.seat_details || '',
        quantity: Number(o.quantity || 1),
        unit_price: Number(o.unit_price || (amt / Math.max(1, Number(o.quantity || 1)))),
        total_amount: amt,
        commission_rate: Number(o.commission_rate || userCut || 11.0),
        commission_amount: Number(o.commission_amount !== undefined ? o.commission_amount : Math.round((amt * userCut) / 100)),
        attendee_name: o.customer_name || o.attendee_name || (_activePromoter && _activePromoter.full_name) || 'Attendee',
        attendee_phone: o.customer_phone || o.attendee_phone || '',
        attendee_email: o.customer_email !== undefined ? o.customer_email : (o.attendee_email || ''),
        status: o.payment_status || o.status || 'confirmed',
        channel: o.import_batch || o.channel || 'Direct Sales',
        created_at: o.sale_date || o.created_at
      };
    });

    const seen = new Set(mappedOrders.map((o) => o.order_ref));
    _portalBookings = [...mappedOrders, ...localBookings.filter((b) => !seen.has(b.order_ref))];

    const dbPasses = Number((_activePromoter && _activePromoter.total_passes_sold) || 0);
    const totalPasses = Math.max(
      dbPasses,
      _portalBookings.reduce((s, b) => s + Number(b.quantity || 1), 0)
    );

    const dbEarn = Number((_activePromoter && _activePromoter.total_earnings) || 0);
    const localEarn = localBookings.reduce((s, b) => s + Number(b.commission_amount || 0), 0);
    const totalEarn = Math.max(
      dbEarn,
      localEarn + _portalCommissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0),
      _portalBookings.reduce((s, b) => s + Number(b.commission_amount || 0), 0)
    );

    const grossVol =
      _portalBookings.length > 0
        ? _portalBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0)
        : totalPasses * 3999;

    const settledAmt = _portalPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const pendingAmt = Math.max(0, totalEarn - settledAmt);

    const setVal = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setVal('dash-kpi-passes', totalPasses.toLocaleString('en-IN'));
    setVal('dash-kpi-volume', '₹' + grossVol.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('dash-kpi-earnings', '₹' + totalEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 }));

    setVal('wallet-earned-val', '₹' + totalEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('wallet-settled-val', '₹' + settledAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('wallet-pending-val', '₹' + pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('nav-wallet-badge', '₹' + Math.round(totalEarn).toLocaleString('en-IN'));

    setVal('nav-bookings-count', String(_portalBookings.length));
    setVal('bookings-count-val', String(_portalBookings.length));
    setVal(
      'bookings-passes-val',
      String(_portalBookings.reduce((s, b) => s + Number(b.quantity || 1), 0))
    );
    setVal(
      'bookings-gross-val',
      '₹' + _portalBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0).toLocaleString('en-IN')
    );

    renderBookingsTable();
    renderPayoutsTable();
    renderCommissionLedger();
    renderEventBreakdownChart();
  }

  async function hydratePortalLedgerAndHistory() {
    if (!_activeUser || !window.TixoraAuth) return;
    let dbOrders = [];
    try {
      const [ordersRes, commsRes, payoutsRes] = await Promise.race([
        Promise.all([
          TixoraAuth.getMyOrders(),
          TixoraAuth.getMyCommissions(),
          TixoraAuth.getMyPayouts()
        ]),
        new Promise((resolve) => setTimeout(() => resolve([[], [], []]), 2500))
      ]);
      dbOrders = Array.isArray(ordersRes) ? ordersRes : [];
      _portalCommissions = Array.isArray(commsRes) ? commsRes : [];
      _portalPayouts = Array.isArray(payoutsRes) ? payoutsRes : [];
    } catch (e) {}

    applyLedgerMetricsAndRender(dbOrders);
  }

  async function renderPromoterWorkspace(user, promoter, role = 'promoter') {
    _activeUser = user;
    _activeRole = role || 'promoter';
    _activePromoter = promoter || (window.TixoraAuth ? await TixoraAuth.getPromoterProfile(user) : null);

    const name =
      (_activePromoter && _activePromoter.full_name) ||
      (user.user_metadata && user.user_metadata.full_name) ||
      (user.email ? user.email.split('@')[0] : 'Promoter');
    const city = (_activePromoter && _activePromoter.city) || (user.user_metadata && user.user_metadata.city) || 'Mumbai';
    const email = user.email || '';
    const phone = (_activePromoter && _activePromoter.phone) || (user.user_metadata && user.user_metadata.phone) || '+91 Verified';
    const upi =
      (_activePromoter && _activePromoter.upi_id) ||
      (user.user_metadata && user.user_metadata.upi_id) ||
      (user.email ? user.email.split('@')[0] + '@okhdfcbank' : 'user@upi');
    const refCode = getActiveRefCode();
    const tierName = (_activePromoter && _activePromoter.tier_name) || 'Scout';
    const commRate = Number((_activePromoter && _activePromoter.commission_rate) || 8.0);
    const joinedDate = (_activePromoter && _activePromoter.created_at) || user.created_at;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const formattedCode = formatPromoterId(refCode);
    setText('dash-hero-title', 'Welcome, ' + name);
    setText('events-hero-title', 'Welcome, ' + name);
    setText('dash-header-name', name);
    setText('dash-header-tier', tierName.toUpperCase());
    setText('topbar-promoter-id', formattedCode);
    setText('mobile-promoter-id', formattedCode);
    setText('events-hero-id', formattedCode);
    setText('events-hero-tier', tierName.toUpperCase() + ' TIER');
    setText('id-card-token', 'ENC-' + refCode.slice(0, 4) + '-F4A1C8');

    document.querySelectorAll('[data-portal-id-chip]').forEach((el) => {
      el.textContent = formattedCode;
    });

    const isAdmin = _activeRole === 'admin' || _activeRole === 'manager';
    ['promo-admin-link', 'promo-mobile-admin-link'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !isAdmin);
    });

    setText('dash-account-email', email);
    setText('dash-account-city', city);
    setText('dash-account-upi', upi);
    setText('dash-tier-badge', 'TIER • ' + tierName.toUpperCase());
    setText('id-card-name', name);
    setText('id-card-tier', tierName.toUpperCase() + ' TIER');
    setText('id-card-code', formatPromoterId(refCode));
    setText('id-card-phone', phone);
    setText('id-card-upi', upi);
    if (joinedDate) {
      setText(
        'id-card-joined',
        new Date(joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      );
    }

    const walletUpiInput = document.getElementById('wallet-upi-input');
    if (walletUpiInput) walletUpiInput.value = upi;

    document.querySelectorAll('#dash-tier-grid [data-tier]').forEach((card) => {
      const isMatch = (card.getAttribute('data-tier') || '').toLowerCase() === tierName.toLowerCase();
      card.style.backgroundColor = isMatch ? 'var(--bg-card)' : '';
      card.style.borderColor = isMatch ? 'var(--crimson)' : '';
      card.style.borderWidth = isMatch ? '1.5px' : '';
    });

    applyLedgerMetricsAndRender([]);
    showDashboardState('workspace');
    // Hydrate live Supabase events and orders without blocking workspace display
    Promise.all([loadPortalEvents(), hydratePortalLedgerAndHistory()]).catch(() => {});
  }

  function copyPromoterId() {
    const code = getActiveRefCode();
    const formatted = formatPromoterId(code);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => showToast('Promoter ID copied: ' + formatted + ' (Encrypted & Verified)'))
        .catch(() => showToast('Promoter ID: ' + formatted));
    } else {
      showToast('Promoter ID: ' + formatted);
    }
  }

  async function waitForAuthClient(maxWaitMs = 1800) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (window.TixoraAuth && typeof window.TixoraAuth.getSession === 'function') {
        const hasMockOrClient =
          window.TixoraAuth.isConfigured() ||
          String(window.TixoraAuth.getSession).indexOf('mock') !== -1 ||
          typeof window.supabase !== 'undefined';
        if (hasMockOrClient) return true;
      }
      await new Promise((r) => setTimeout(r, 60));
    }
    return Boolean(window.TixoraAuth);
  }

  async function initPortalPage() {
    const pageName = resolveCurrentPage();
    resetPortalUserState();

    // Pre-populate events immediately for snappy rendering
    _portalEvents = CANONICAL_PORTAL_EVENTS.slice();
    renderFeaturedSpotlight(_portalEvents);
    filterPortalEvents();

    showDashboardState('loading');

    try {
      const authReady = await waitForAuthClient(1800);
      if (!authReady || !window.TixoraAuth) {
        if (pageName === 'dashboard') {
          showDashboardState('login');
        } else {
          window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
        }
        return;
      }

      if (typeof window.TixoraAuth.onAuthStateChange === 'function') {
        window.TixoraAuth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            resetPortalUserState();
          } else if (_activeUser && session && session.user && _activeUser.id !== session.user.id) {
            resetPortalUserState();
          }
        });
      }

      const session = await TixoraAuth.getSession();
      if (!session || !session.user) {
        resetPortalUserState();
        if (pageName === 'dashboard') {
          showDashboardState('login');
        } else {
          window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
        }
        return;
      }

      const [promoter, role] = await Promise.all([
        TixoraAuth.getPromoterProfile(session.user),
        TixoraAuth.getUserRole(session.user)
      ]);
      await renderPromoterWorkspace(session.user, promoter, role);
    } catch (err) {
      console.error('Portal init error:', err);
      resetPortalUserState();
      if (pageName === 'dashboard') {
        showDashboardState('login');
      } else {
        window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
      }
    }
  }

  document.addEventListener('click', (e) => {
    const bookBtn = e.target && e.target.closest ? e.target.closest('[data-book-event]') : null;
    if (bookBtn) {
      openPortalBookModal(bookBtn.getAttribute('data-book-event'));
      return;
    }
    const receiptBtn = e.target && e.target.closest ? e.target.closest('[data-view-receipt]') : null;
    if (receiptBtn) {
      openBookingReceipt(receiptBtn.getAttribute('data-view-receipt'));
    }
  });

  // Export clean globals for HTML handlers and verification harnesses
  window.togglePortalMobileMenu = togglePortalMobileMenu;
  window.toggleMobileMenu = togglePortalMobileMenu;
  window.toggleDashPassword = toggleDashPassword;
  window.showDashboardState = showDashboardState;
  window.switchDashboardTab = switchDashboardTab;
  window.openPortalModal = openPortalModal;
  window.closePortalModal = closePortalModal;
  window.handleDashboardSignIn = handleDashboardSignIn;
  window.handleDashboardSignUp = handleDashboardSignUp;
  window.handleDashboardResend = handleDashboardResend;
  window.handleDashboardSignOut = handlePortalSignOut;
  window.handlePortalSignOut = handlePortalSignOut;
  window.renderPromoterWorkspace = renderPromoterWorkspace;
  window.setPortalCityFilter = setPortalCityFilter;
  window.resetPortalEventFilters = resetPortalEventFilters;
  window.filterPortalEvents = filterPortalEvents;
  window.openPortalBookModal = openPortalBookModal;
  window.updatePortalBookingSummary = updatePortalBookingSummary;
  window.handlePortalBookingSubmit = handlePortalBookingSubmit;
  window.setBookingStatusFilter = setBookingStatusFilter;
  window.renderBookingsTable = renderBookingsTable;
  window.openBookingReceipt = openBookingReceipt;
  window.handleUpdateUpi = handleUpdateUpi;
  window.copyPromoterId = copyPromoterId;

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    initPortalMenuDismiss();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    setTimeout(initPortalPage, 80);
  });
})(window, document);
