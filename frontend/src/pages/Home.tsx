import { Link } from "react-router-dom";
import {
  Heart,
  Scale,
  FileText,
  Users,
  BookOpen,
  MessageCircle,
  Shield,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

const Home = () => {
  const { t } = useLanguage();

  const images = [
    "/women1.jpeg",
    "/women2.jpg",
    "/women3.jfif",
    "/women4.jfif",
    "/women5.jfif",
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const features = [
    {
      icon: Scale,
      title: t('home.feature1.title'),
      description: t('home.feature1.desc'),
      path: "/legal-advisor",
      color: "bg-blue-500",
    },
    {
      icon: FileText,
      title: t('home.feature2.title'),
      description: t('home.feature2.desc'),
      path: "/appeal-generator",
      color: "bg-green-500",
    },
    {
      icon: Users,
      title: t('home.feature3.title'),
      description: t('home.feature3.desc'),
      path: "/support-directory",
      color: "bg-purple-500",
    },
    {
      icon: BookOpen,
      title: t('home.feature4.title'),
      description: t('home.feature4.desc'),
      path: "/case-stories",
      color: "bg-orange-500",
    },
    {
      icon: MessageCircle,
      title: t('home.feature5.title'),
      description: t('home.feature5.desc'),
      path: "/story-wall",
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
      {/* Hero Section with Carousel */}
      <section className="py-20 pt-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-15 items-center">
            <div className="text-center lg:text-left">
              <h1 className="flex items-center gap-4 text-5xl font-bold mb-4">
                <Heart className="w-12 h-12" />
                {t('home.hero.title')}
              </h1>
              <p className="text-2xl mb-5 opacity-90">
                {t('home.hero.subtitle')}
              </p>
              <p className="text-lg mb-8 opacity-80 leading-relaxed">
                {t('home.hero.desc')}
              </p>
              <div className="flex gap-4 justify-center lg:justify-start">
                <Link to="/legal-advisor" className="btn btn-primary">
                  {t('home.hero.cta1')}
                </Link>
                <Link to="/support-directory" className="btn btn-secondary">
                  {t('home.hero.cta2')}
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl h-64 sm:h-80 lg:h-96 xl:h-[28rem] rounded-2xl overflow-hidden shadow-2xl">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    <img
                      src={image}
                      alt={`Empowered women ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                  </div>
                ))}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentImageIndex
                          ? "bg-white shadow-lg scale-110"
                          : "bg-white/60 hover:bg-white/80"
                        }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-center text-4xl font-bold mb-15 text-gray-900">
            {t('home.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  to={feature.path}
                  className="card hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-15 h-15 rounded-full flex items-center justify-center mb-5 ${feature.color}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-15">
            <div className="lg:col-span-2">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                {t('home.about.title')}
              </h2>
              <p className="text-gray-600 mb-5 leading-relaxed">
                {t('home.about.desc1')}
              </p>
              <ul className="mb-5 space-y-2">
                <li className="text-gray-600">{t('home.about.item1')}</li>
                <li className="text-gray-600">{t('home.about.item2')}</li>
                <li className="text-gray-600">{t('home.about.item3')}</li>
                <li className="text-gray-600">{t('home.about.item4')}</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                {t('home.about.desc2')}
              </p>
            </div>
            <div className="space-y-8">
              <div className="card">
                <Globe className="w-10 h-10 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {t('home.about.wide')}
                </h3>
                <p className="text-gray-600 text-sm">
                  {t('home.about.wideDesc')}
                </p>
              </div>
              <div className="card">
                <Shield className="w-10 h-10 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {t('home.about.confidential')}
                </h3>
                <p className="text-gray-600 text-sm">
                  {t('home.about.confidentialDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500 text-center">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-4xl font-bold mb-4">{t('home.cta.title')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('home.cta.subtitle')}</p>
          <Link to="/legal-advisor" className="btn btn-primary btn-large">
            {t('home.cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;