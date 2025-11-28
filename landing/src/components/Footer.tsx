import prosperaIcon from "@/assets/prospera-icon-new.png";
import { Mail, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container px-4">
      <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={prosperaIcon} alt="Prospera" className="h-10 w-10" />
              <span className="font-bold text-xl">Prospera</span>
            </div>
            <p className="text-sm opacity-80">
              Crescendo com Inteligência Financeira
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/cookies" className="hover:text-primary transition-colors">Política de Cookies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:prospera.brasil.tecnologias@gmail.com" className="hover:text-primary transition-colors">
                  prospera.brasil.tecnologias@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                <a href="https://www.instagram.com/financas.tecnologica?igsh=ZW53YXk3M2VnbWl3" className="hover:text-primary transition-colors">
                  @Prospera Brasil Tecnologias
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-80">
          <p>&copy; 2025 Prospera Finanças Tecnológicas. Todos os direitos reservados.</p>
          <p>Desenvolvido com 🧡 para brasileiros</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
