export default function Pricing() {
    return (
        <section id="pricing">
            <h2>Simple pricing</h2>
            <div className="pricing-grid">
                <div className="pricing-card nbtc pricing-free">
                    <h3>Free</h3>
                    <p className="pricing-price">£0</p>
                    <ul>
                        <li>1 embeddable CamelClock + shareable link</li>
                        <li>Basic style customisations (colours, size)</li>
                        <li>CamelClock watermark</li>
                    </ul>
                    <button className="pricing-button" type="button">
                        Choose Free
                    </button>
                </div>

                <div className="pricing-card nbtc pricing-pro">
                    <h3>Pro</h3>
                    <p className="pricing-price">£7.99 <span className="pricing-period">/ month</span></p>
                    <ul>
                        <li>Up to 10 embeddable CamelClock</li>
                        <li>More advanced style customisation (wearables, branding)</li>
                        <li>Collect customers for waitlist</li>
                        <li>No CamelClock watermark</li>
                    </ul>
                    <button className="pricing-button" type="button">
                        Choose Pro
                    </button>
                </div>
            </div>
        </section>
    );
}
