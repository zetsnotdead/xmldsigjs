import { Convert } from "xml-core";
import { Application } from "../application";
import { Certificate, RelativeDistinguishedNames, setEngine, getCrypto } from "pkijs";
import * as Asn1Js from "asn1js";

export declare type DigestAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

// declare type RDN = {
//     types_and_values: TypeAndValue[];
// }

// declare type TypeAndValue = {
//     type: string;
//     value: {
//         value_block: {
//             value: string;
//         }
//     };
// }

/**
 * List of OIDs
 * Source: https://msdn.microsoft.com/ru-ru/library/windows/desktop/aa386991(v=vs.85).aspx 
 */
const OID: { [key: string]: { short?: string, long?: string } } = {
    "2.5.4.3": {
        short: "CN",
        long: "CommonName"
    },
    "2.5.4.6": {
        short: "C",
        long: "Country"
    },
    "2.5.4.5": {
        long: "DeviceSerialNumber"
    },
    "0.9.2342.19200300.100.1.25": {
        short: "DC",
        long: "DomainComponent"
    },
    "1.2.840.113549.1.9.1": {
        short: "E",
        long: "EMail"
    },
    "2.5.4.42": {
        short: "G",
        long: "GivenName"
    },
    "2.5.4.43": {
        short: "I",
        long: "Initials"
    },
    "2.5.4.7": {
        short: "L",
        long: "Locality"
    },
    "2.5.4.10": {
        short: "O",
        long: "Organization"
    },
    "2.5.4.11": {
        short: "OU",
        long: "OrganizationUnit"
    },
    "2.5.4.8": {
        short: "ST",
        long: "State"
    },
    "2.5.4.9": {
        short: "Street",
        long: "StreetAddress"
    },
    "2.5.4.4": {
        short: "SN",
        long: "SurName"
    },
    "2.5.4.12": {
        short: "T",
        long: "Title"
    },
    "1.2.840.113549.1.9.8": {
        long: "UnstructuredAddress"
    },
    "1.2.840.113549.1.9.2": {
        long: "UnstructuredName"
    }
};

/**
 * Represents an <X509Certificate> element.
 */
export class X509Certificate {

    protected raw: Uint8Array;
    protected simpl: Certificate;
    protected publicKey: CryptoKey | null = null;

    constructor(rawData?: BufferSource) {
        if (rawData) {
            const buf = new Uint8Array(rawData as ArrayBuffer);
            this.LoadRaw(buf);
            this.raw = buf;
        }
    }

    /**
     * Gets a serial number of the certificate in HEX format  
     */
    public get SerialNumber(): string {
        return Convert.ToHex(new Uint8Array(this.simpl.serialNumber.valueBlock.valueHex));
    }

    /**
     * Converts X500Name to string 
     * @param  {RDN} name X500Name
     * @param  {string} spliter Splitter char. Default ','
     * @returns string Formated string
     * Example:
     * > C=Some name, O=Some organization name, C=RU
     */
    protected NameToString(name: RelativeDistinguishedNames, spliter: string = ","): string {
        let res: string[] = [];
        for (let type_and_value of name.typesAndValues) {
            let type = type_and_value.type;
            let name = OID[type.toString()].short;
            res.push(`${name ? name : type}=${type_and_value.value.valueBlock.value}`);
        }
        return res.join(spliter + " ");
    }

    /**
     * Gets a issuer name of the certificate 
     */
    public get Issuer(): string {
        return this.NameToString(this.simpl.issuer);
    }

    /**
     * Gets a subject name of the certificate 
     */
    public get Subject(): string {
        return this.NameToString(this.simpl.subject);
    }

    /**
     * Returns a thumbrint of the certififcate
     * @param  {DigestAlgorithm="SHA-1"} algName Digest algorithm name
     * @returns PromiseLike
     */
    public Thumbprint(algName: DigestAlgorithm = "SHA-1"): PromiseLike<ArrayBuffer> {
        return Application.crypto.subtle.digest(algName, this.raw);
    }

    /**
     * Loads X509Certificate from DER data
     * @param  {Uint8Array} rawData
     */
    protected LoadRaw(rawData: BufferSource) {
        this.raw = new Uint8Array(rawData as ArrayBuffer);
        let asn1 = Asn1Js.fromBER(this.raw.buffer);
        this.simpl = new Certificate({ schema: asn1.result });
    }

    /**
     * Gets the public key from the X509Certificate
     */
    get PublicKey(): CryptoKey | null {
        return this.publicKey;
    }

    /**
     * Returns DER raw of X509Certificate
     */
    GetRaw(): Uint8Array {
        return this.raw;
    }

    /**
     * Returns public key from X509Certificate
     * @param  {Algorithm} algorithm
     * @returns Promise
     */
    exportKey(algorithm: Algorithm) {
        return Promise.resolve()
            .then(() => {
                if (!getCrypto())
                    setEngine(Application.crypto.name, Application.crypto, Application.crypto.subtle);
                let alg = {
                    algorithm,
                    usages: ["verify"]
                };
                return this.simpl.getPublicKey({ algorithm: alg })
                    .then(key => {
                        this.publicKey = key;
                        return key;
                    });
            });
    }
}