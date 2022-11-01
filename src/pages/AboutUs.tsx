import { Heading, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import PageContainer from '../components/common/layout/PageContainer';
import WrapStack from '../components/common/layout/WrapStack';
import DownloadFileLink from '../components/common/links/DownloadFileLink';
import ExternalLink from '../components/common/links/ExternalLink';
import LogoLink from '../components/common/links/LogoLink';
import JrcLogo from '../static/JrC.png';

const AboutUs: React.FC = () => {
  return (
    <PageContainer>
      <VStack py="10vh" alignItems="left" w="min(90%, 800px)" mx="auto" spacing={5}>
        <Heading>Om Vedtatt.no</Heading>
        <Text>
          Vedtatt.no er et digitalt stemmesystem utviklet av Organisasjonskollegiet og Junior Consulting med støtte fra
          Velferdstinget i Gjøvik, Ålesund og Trondheim. Målet er at frivillige organisasjoner skal kunne gjennomføre
          effektive og gode demokratiske prosesser. Informasjon om hvordan vi håndterer brukeren din, anonymitet og selvregistrering kan 
          finnes <DownloadFileLink href={process.env.PUBLIC_URL + "/privacy-and-safety.pdf" }>her</DownloadFileLink>.
        </Text>
        <Text>
          <ExternalLink href="https://organisasjonskollegiet.no/">Organisasjonskollegiet</ExternalLink> er en gjeng med
          lang erfaring fra frivilligheten og studentpolitikken ved NTNU som hjelper organisasjoner i Trondheim med
          utfordringer som ordstyring, utforming av vedtekter, sakspapirer, og lignende. Etter å ha ordstyrt en lang
          rekke årsmøter, generalforsamlinger og andre møter merket vi et stort behov for et godt, gratis digitalt
          stemmeverktøy som kunne dekke behovene til organisasjonene vi støttet.
        </Text>
        <Text>
          <ExternalLink href="https://velferdstinget.no/">Velferdstinget i Gjøvik, Ålesund og Trondheim</ExternalLink>{' '}
          er et studentpolitisk organ som har som oppgave å ivareta og bedre velferdstilbud for studentene ved deres
          studiesteder. Velferdstinget valgte å støtte prosjektet økonomisk slik at vi hadde muligheten til å utvikle et
          profesjonelt verktøy som kunne sørge for at organisasjoner tilknyttet deres studiesteder skal kunne
          gjennomføre effektive, gode valg i deres demokratiske møter.
        </Text>
        <Text>
          <ExternalLink href="https://www.jrc.no">Junior Consulting</ExternalLink> er et studentkonsulenthus bestående
          av studenter fra mange forskjellige studieprogram ved NTNU. De har stått for design og utvikling av løsningen
          og har hjulpet oss i Organisasjonskollegiet med å omforme vår organisasjonskunnskap til produktutvikling.
        </Text>
        <WrapStack breakpoint={800} spacing="0" justifyContent="space-between">
          <LogoLink
            href="https://organisasjonskollegiet.no/"
            src="https://images.squarespace-cdn.com/content/v1/5c38b52f2487fdae852bdc70/1584098071586-CFU6NPF6HTRJEOLQMHC4/logoLarge.png"
            alt="Organisasjonskollegiet"
          />
          <LogoLink
            href="https://velferdstinget.no/"
            src="https://velferdstinget.no/static/VTlogo.svg"
            alt="Velferdstinget"
          />
          <LogoLink href="https://www.jrc.no" src={JrcLogo} alt="Junior Consulting" />
        </WrapStack>
      </VStack>
    </PageContainer>
  );
};

export default AboutUs;
