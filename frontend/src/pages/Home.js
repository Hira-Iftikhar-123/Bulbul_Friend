import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header with Arabic calligraphy style */}
      <header className="header" style={{  paddingRight: '20px' }}>
        <h1 className="arabic-text" style={{ fontWeight: 700, fontSize: '2.7rem', marginBottom: 0 }}>
          بلبل - رفيقك العربي
        </h1>
        <p className="arabic-text" style={{ fontWeight: 400, fontSize: '1.3rem', color: 'var(--accent)' }}>
          تعلم العربية بطريقة ممتعة وحديثة
        </p>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h2 className="arabic-text" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '2.2rem' }}>
          مرحباً بك في بلبل!
        </h2>
        <p className="arabic-text" style={{ color: 'var(--bot-bg2)', fontWeight: 400, fontSize: '1.1rem', marginTop: '1rem' }}>
          رفيقك الذكي لتعلم اللغة العربية بثقة ومتعة
        </p>
        <div style={{ marginTop: '2rem' }}>
          <Link to="/chat" className="btn-primary" style={{ fontSize: '1.1rem' }}>
            ابدأ المحادثة الآن
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
            لماذا بلبل؟
          </h2>
          <p className="arabic-text" style={{ color: 'var(--bot-bg2)', fontSize: '1.1rem' }}>
            منصتنا تجمع بين التكنولوجيا الحديثة وجمال الثقافة العربية لتجربة تعلم فريدة.
          </p>
        </div>
        <div className="features-grid">
          <div className="card-hover text-center">
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>💬</div>
            <h3 className="arabic-text" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>
              محادثة ذكية
            </h3>
            <p className="arabic-text" style={{ color: 'var(--bot-bg2)' }}>
              تحدث مع بلبل وتعلم العربية من خلال محادثات واقعية وتفاعلية.
            </p>
          </div>
          <div className="card-hover text-center">
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>🕌</div>
            <h3 className="arabic-text" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>
              لمسة ثقافية
            </h3>
            <p className="arabic-text" style={{ color: 'var(--bot-bg2)' }}>
              استمتع بعبارات وأمثال عربية أصيلة ولمسات من الفن الإسلامي.
            </p>
          </div>
          <div className="card-hover text-center">
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>📚</div>
            <h3 className="arabic-text" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>
              تعلم مخصص
            </h3>
            <p className="arabic-text" style={{ color: 'var(--bot-bg2)' }}>
              تقدم حسب مستواك مع دروس وأنشطة مصممة لك.
            </p>
          </div>
          <div className="card-hover text-center">
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>🌙</div>
            <h3 className="arabic-text" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>
              تصميم عصري
            </h3>
            <p className="arabic-text" style={{ color: 'var(--bot-bg2)' }}>
              واجهة أنيقة مستوحاة من الألوان والزخارف العربية.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{ paddingRight: '20px' }}>
        <h2 className="arabic-text" style={{ fontWeight: 700, fontSize: '2rem', color: 'var(--accent)' }}>
          مستعد لبدء رحلتك العربية؟
        </h2>
        <p className="arabic-text" style={{ fontSize: '1.1rem', margin: '1rem 0 2rem 0', color: '#fffbe6' }}>
          انضم إلى آلاف المتعلمين الذين يطورون مهاراتهم مع بلبل.
        </p>
        <Link to="/chat" className="btn-primary" style={{ fontSize: '1.1rem', background: 'var(--accent)', color: 'var(--primary)' }}>
          ابدأ الآن
        </Link>
      </section>
    </div>
  );
};

export default Home; 