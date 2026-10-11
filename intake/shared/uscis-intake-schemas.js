(function () {
  'use strict';

  const yesNo=[{value:'yes',label:'Sí'},{value:'no',label:'No'}];
  const yesNoUnknown=[{value:'yes',label:'Sí'},{value:'no',label:'No'},{value:'unknown',label:'No sabe'}];
  const sexOptions=[{value:'male',label:'Masculino'},{value:'female',label:'Femenino'}];
  const maritalStatusOptions=[{value:'single',label:'Soltero/a, nunca casado/a'},{value:'married',label:'Casado/a'},{value:'divorced',label:'Divorciado/a'},{value:'widowed',label:'Viudo/a'},{value:'separated',label:'Separado/a'},{value:'annulled',label:'Matrimonio anulado'}];

  const addressFields=prefix=>[
    {key:`${prefix}Street`,label:'Calle y número',type:'text'},
    {key:`${prefix}UnitType`,label:'Tipo de unidad',type:'select',options:[{value:'',label:'Ninguno'},{value:'apt',label:'Apt.'},{value:'ste',label:'Ste.'},{value:'flr',label:'Flr.'}]},
    {key:`${prefix}Unit`,label:'Número de unidad',type:'text'},
    {key:`${prefix}City`,label:'Ciudad o pueblo',type:'text'},
    {key:`${prefix}State`,label:'Estado',type:'text'},
    {key:`${prefix}Zip`,label:'ZIP Code',type:'text'},
    {key:`${prefix}Province`,label:'Provincia',type:'text'},
    {key:`${prefix}PostalCode`,label:'Código postal',type:'text'},
    {key:`${prefix}Country`,label:'País',type:'text'}
  ];
  const nameFields=prefix=>[
    {key:`${prefix}LastName`,label:'Apellido',type:'text'},
    {key:`${prefix}FirstName`,label:'Nombre',type:'text'},
    {key:`${prefix}MiddleName`,label:'Segundo nombre',type:'text'}
  ];
  const employmentRepeater=(key,label)=>({key,label,type:'repeater',addLabel:'Agregar empleo',fields:[{key:'employerName',label:'Nombre del empleador o compañía',type:'text'},...addressFields('employerAddress'),{key:'occupation',label:'Ocupación',type:'text'},{key:'dateFrom',label:'Desde',type:'date'},{key:'dateTo',label:'Hasta',type:'dateOrPresent'}]});
  const spouseRepeater=(key,label)=>({key,label,type:'repeater',addLabel:'Agregar cónyuge',fields:[...nameFields('spouse'),{key:'marriageEnded',label:'Fecha en que terminó el matrimonio, si aplica',type:'date'}]});
  const parentFields=(prefix,n)=>[
    {key:`${prefix}LastName`,label:`Apellido del padre/madre ${n}`,type:'text'},
    {key:`${prefix}FirstName`,label:`Nombre del padre/madre ${n}`,type:'text'},
    {key:`${prefix}MiddleName`,label:`Segundo nombre del padre/madre ${n}`,type:'text'},
    {key:`${prefix}DOB`,label:'Fecha de nacimiento',type:'date'},
    {key:`${prefix}Sex`,label:'Sexo',type:'radio',options:sexOptions},
    {key:`${prefix}BirthCity`,label:'Ciudad / pueblo de nacimiento',type:'text'},
    {key:`${prefix}BirthCountry`,label:'País de nacimiento',type:'text'},
    {key:`${prefix}ResidenceCity`,label:'Ciudad / pueblo de residencia actual',type:'text'},
    {key:`${prefix}ResidenceCountry`,label:'País de residencia actual',type:'text'}
  ];

  const I130={
    id:'I-130',title:'Petición para Familiar Extranjero',edition:'04/01/24',officialForm:'I-130',
    requires:[{form:'I-130A',when:{field:'relationship',equals:'spouse'}}],
    sections:[
      {id:'i130-part1',title:'Parte 1 · Relación Familiar',uscisPart:'Part 1',fields:[
        {key:'relationship',label:'¿Para quién presenta esta petición?',type:'radio',required:true,source:'Part 1, Item 1',options:[{value:'spouse',label:'Esposo/a'},{value:'parent',label:'Padre o madre'},{value:'sibling',label:'Hermano/a'},{value:'child',label:'Hijo/a'}]},
        {key:'childParentRelationship',label:'Tipo de relación entre padre/madre e hijo/a',type:'radio',source:'Part 1, Item 2',visibleWhen:{field:'relationship',in:['child','parent']},options:[{value:'marriedParents',label:'Hijo/a nacido/a de padres casados entre sí al momento del nacimiento'},{value:'unmarriedParents',label:'Hijo/a nacido/a de padres no casados entre sí al momento del nacimiento'},{value:'step',label:'Hijastro/a o padrastro/madrastra'},{value:'adopted',label:'Relación por adopción'}]},
        {key:'siblingRelatedByAdoption',label:'¿La relación entre hermanos es por adopción?',type:'radio',options:yesNo,source:'Part 1, Item 3',visibleWhen:{field:'relationship',equals:'sibling'}},
        {key:'petitionerStatusThroughAdoption',label:'¿Obtuvo residencia permanente o ciudadanía por adopción?',type:'radio',options:yesNo,source:'Part 1, Item 4'}
      ]},

      {id:'i130-part2-identification',title:'Parte 2 · Peticionario — Identificación',uscisPart:'Part 2',fields:[
        {key:'petitionerANumber',label:'A-Number, si tiene',type:'text',source:'Part 2, Item 1'},
        {key:'petitionerUSCISOnlineAccountNumber',label:'USCIS Online Account Number, si tiene',type:'text',source:'Part 2, Item 2'},
        {key:'petitionerSSN',label:'Número de Seguro Social, si tiene',type:'text',sensitive:true,source:'Part 2, Item 3'},
        ...nameFields('petitioner'),
        {key:'petitionerOtherNames',label:'Otros nombres utilizados anteriormente',type:'repeater',addLabel:'Agregar otro nombre',source:'Part 2, Item 5',fields:nameFields('otherName')},
        {key:'petitionerBirthCity',label:'Ciudad / pueblo de nacimiento',type:'text',source:'Part 2, Item 6'},
        {key:'petitionerBirthCountry',label:'País de nacimiento',type:'text',source:'Part 2, Item 7'},
        {key:'petitionerDOB',label:'Fecha de nacimiento',type:'date',source:'Part 2, Item 8'},
        {key:'petitionerSex',label:'Sexo',type:'radio',options:sexOptions,source:'Part 2, Item 9'}
      ]},

      {id:'i130-part2-mailing',title:'Parte 2 · Peticionario — Dirección Postal',uscisPart:'Part 2',fields:[
        {key:'petitionerMailCareOf',label:'A nombre de / In Care Of, si aplica',type:'text',source:'Part 2, Item 10.a'},
        ...addressFields('petitionerMailing'),
        {key:'petitionerMailingSameAsPhysical',label:'¿La dirección postal actual es igual a la dirección física actual?',type:'radio',options:yesNo,source:'Part 2, Item 11'}
      ]},

      {id:'i130-part2-address-history',title:'Parte 2 · Peticionario — Historial de Direcciones',description:'Recopilar todas las direcciones físicas de los últimos 5 años.',fields:[
        {key:'petitionerAddressHistory',label:'Direcciones físicas de los últimos 5 años',type:'repeater',addLabel:'Agregar dirección',source:'Part 2, Items 12–15',fields:[...addressFields('physical'),{key:'dateFrom',label:'Desde',type:'date'},{key:'dateTo',label:'Hasta',type:'dateOrPresent'}]}
      ]},

      {id:'i130-part2-marital',title:'Parte 2 · Peticionario — Historial Matrimonial',fields:[
        {key:'petitionerMarriageCount',label:'¿Cuántas veces ha estado casado/a?',type:'number',source:'Part 2, Item 16'},
        {key:'petitionerMaritalStatus',label:'Estado civil actual',type:'radio',options:maritalStatusOptions,source:'Part 2, Item 17'},
        {key:'petitionerCurrentMarriageDate',label:'Fecha del matrimonio actual',type:'date',source:'Part 2, Item 18',visibleWhen:{field:'petitionerMaritalStatus',equals:'married'}},
        {key:'petitionerMarriageCity',label:'Ciudad donde se celebró el matrimonio actual',type:'text',source:'Part 2, Item 19.a',visibleWhen:{field:'petitionerMaritalStatus',equals:'married'}},
        {key:'petitionerMarriageState',label:'Estado',type:'text',source:'Part 2, Item 19.b',visibleWhen:{field:'petitionerMaritalStatus',equals:'married'}},
        {key:'petitionerMarriageProvince',label:'Provincia',type:'text',source:'Part 2, Item 19.c',visibleWhen:{field:'petitionerMaritalStatus',equals:'married'}},
        {key:'petitionerMarriageCountry',label:'País',type:'text',source:'Part 2, Item 19.d',visibleWhen:{field:'petitionerMaritalStatus',equals:'married'}},
        spouseRepeater('petitionerSpouses','Cónyuge actual y cónyuges anteriores')
      ]},

      {id:'i130-part2-parents',title:'Parte 2 · Peticionario — Padres',fields:[...parentFields('petitionerParent1',1),...parentFields('petitionerParent2',2)]},

      {id:'i130-part2-status',title:'Parte 2 · Peticionario — Ciudadanía o Residencia',fields:[
        {key:'petitionerImmigrationStatus',label:'Estatus del peticionario',type:'radio',source:'Part 2, Item 36',options:[{value:'uscitizen',label:'Ciudadano estadounidense'},{value:'lpr',label:'Residente permanente legal'},{value:'usnational',label:'Nacional de EE. UU. no ciudadano'}]},
        {key:'petitionerCitizenshipHow',label:'¿Cómo obtuvo la ciudadanía estadounidense?',type:'radio',source:'Part 2, Item 37',visibleWhen:{field:'petitionerImmigrationStatus',equals:'uscitizen'},options:[{value:'birth',label:'Nacimiento en Estados Unidos'},{value:'naturalization',label:'Naturalización'},{value:'parents',label:'A través de los padres'}]},
        {key:'petitionerHasCitizenshipCertificate',label:'¿Tiene Certificado de Naturalización o de Ciudadanía?',type:'radio',options:yesNo,source:'Part 2, Item 38',visibleWhen:{field:'petitionerImmigrationStatus',equals:'uscitizen'}},
        {key:'petitionerCitizenshipCertificateNumber',label:'Número del certificado',type:'text',source:'Part 2, Item 39.a',visibleWhen:{field:'petitionerHasCitizenshipCertificate',equals:'yes'}},
        {key:'petitionerCitizenshipCertificatePlace',label:'Lugar de emisión del certificado',type:'text',source:'Part 2, Item 39.b',visibleWhen:{field:'petitionerHasCitizenshipCertificate',equals:'yes'}},
        {key:'petitionerCitizenshipCertificateDate',label:'Fecha de emisión del certificado',type:'date',source:'Part 2, Item 39.c',visibleWhen:{field:'petitionerHasCitizenshipCertificate',equals:'yes'}},
        {key:'petitionerLPRClassOfAdmission',label:'Clase de admisión como residente permanente',type:'text',source:'Part 2, Item 40.a',visibleWhen:{field:'petitionerImmigrationStatus',equals:'lpr'}},
        {key:'petitionerLPRAdmissionDate',label:'Fecha de admisión como residente permanente',type:'date',source:'Part 2, Item 40.b',visibleWhen:{field:'petitionerImmigrationStatus',equals:'lpr'}},
        {key:'petitionerLPRAdmissionCity',label:'Ciudad de admisión',type:'text',source:'Part 2, Item 40.c',visibleWhen:{field:'petitionerImmigrationStatus',equals:'lpr'}},
        {key:'petitionerLPRAdmissionState',label:'Estado de admisión',type:'text',source:'Part 2, Item 40.d',visibleWhen:{field:'petitionerImmigrationStatus',equals:'lpr'}},
        {key:'petitionerLPRThroughMarriage',label:'¿Obtuvo la residencia permanente por matrimonio con ciudadano o residente?',type:'radio',options:yesNo,source:'Part 2, Item 41',visibleWhen:{field:'petitionerImmigrationStatus',equals:'lpr'}}
      ]},

      {id:'i130-part2-employment',title:'Parte 2 · Peticionario — Historial de Empleo',description:'Todos los empleos de los últimos 5 años, dentro o fuera de Estados Unidos.',fields:[employmentRepeater('petitionerEmploymentHistory','Historial de empleo de los últimos 5 años')]},

      {id:'i130-part3-biographic',title:'Parte 3 · Información Biográfica del Peticionario',fields:[
        {key:'petitionerEthnicity',label:'Etnicidad',type:'radio',source:'Part 3, Item 1',options:[{value:'hispanic',label:'Hispano o latino'},{value:'notHispanic',label:'No hispano o latino'}]},
        {key:'petitionerRace',label:'Raza',type:'checkboxGroup',source:'Part 3, Item 2',options:[{value:'white',label:'Blanco'},{value:'asian',label:'Asiático'},{value:'black',label:'Negro o afroamericano'},{value:'nativeAmerican',label:'Indígena americano o nativo de Alaska'},{value:'pacificIslander',label:'Nativo hawaiano u otra isla del Pacífico'}]},
        {key:'petitionerHeightFeet',label:'Estatura — pies',type:'number',source:'Part 3, Item 3'},
        {key:'petitionerHeightInches',label:'Estatura — pulgadas',type:'number',source:'Part 3, Item 3'},
        {key:'petitionerWeight',label:'Peso en libras',type:'number',source:'Part 3, Item 4'},
        {key:'petitionerEyeColor',label:'Color de ojos',type:'select',source:'Part 3, Item 5',options:['Black','Blue','Brown','Gray','Green','Hazel','Maroon','Pink','Unknown/Other'].map(x=>({value:x,label:x}))},
        {key:'petitionerHairColor',label:'Color de cabello',type:'select',source:'Part 3, Item 6',options:['Bald','Black','Blond','Brown','Gray','Red','Sandy','White','Unknown/Other'].map(x=>({value:x,label:x}))}
      ]},

      {id:'i130-part4-beneficiary-identification',title:'Parte 4 · Beneficiario — Identificación',fields:[
        {key:'beneficiaryANumber',label:'A-Number, si tiene',type:'text',source:'Part 4, Item 1'},
        {key:'beneficiaryUSCISOnlineAccountNumber',label:'USCIS Online Account Number, si tiene',type:'text',source:'Part 4, Item 2'},
        {key:'beneficiarySSN',label:'Número de Seguro Social, si tiene',type:'text',sensitive:true,source:'Part 4, Item 3'},
        ...nameFields('beneficiary'),
        {key:'beneficiaryOtherNames',label:'Otros nombres utilizados anteriormente',type:'repeater',addLabel:'Agregar otro nombre',source:'Part 4, Item 5',fields:nameFields('otherName')},
        {key:'beneficiaryBirthCity',label:'Ciudad / pueblo de nacimiento',type:'text',source:'Part 4, Item 6'},
        {key:'beneficiaryBirthCountry',label:'País de nacimiento',type:'text',source:'Part 4, Item 7'},
        {key:'beneficiaryDOB',label:'Fecha de nacimiento',type:'date',source:'Part 4, Item 8'},
        {key:'beneficiarySex',label:'Sexo',type:'radio',options:sexOptions,source:'Part 4, Item 9'},
        {key:'beneficiaryPriorPetitionByAnyone',label:'¿Alguien ha presentado anteriormente una petición migratoria para este beneficiario?',type:'radio',options:yesNoUnknown,source:'Part 4, Item 10'}
      ]},

      {id:'i130-part4-beneficiary-addresses',title:'Parte 4 · Beneficiario — Direcciones y Contacto',fields:[
        {key:'beneficiaryPhysicalAddress',label:'Dirección física actual',type:'group',source:'Part 4, Item 11',fields:addressFields('beneficiaryPhysical')},
        {key:'beneficiaryIntendedUSAddressSame',label:'¿La dirección donde piensa vivir en Estados Unidos es la misma que la dirección física actual?',type:'radio',options:yesNo},
        {key:'beneficiaryIntendedUSAddress',label:'Dirección donde piensa vivir en Estados Unidos',type:'group',source:'Part 4, Item 12',visibleWhen:{field:'beneficiaryIntendedUSAddressSame',equals:'no'},fields:addressFields('beneficiaryIntendedUS')},
        {key:'beneficiaryForeignAddressSame',label:'¿La dirección fuera de Estados Unidos es la misma que la dirección física actual?',type:'radio',options:yesNo},
        {key:'beneficiaryForeignAddress',label:'Dirección fuera de Estados Unidos',type:'group',source:'Part 4, Item 13',visibleWhen:{field:'beneficiaryForeignAddressSame',equals:'no'},fields:addressFields('beneficiaryForeign')},
        {key:'beneficiaryDayPhone',label:'Teléfono durante el día',type:'tel',source:'Part 4, Item 14'},
        {key:'beneficiaryMobilePhone',label:'Teléfono celular',type:'tel',source:'Part 4, Item 15'},
        {key:'beneficiaryEmail',label:'Correo electrónico',type:'email',source:'Part 4, Item 16'}
      ]},

      {id:'i130-part4-beneficiary-marital',title:'Parte 4 · Beneficiario — Historial Matrimonial',fields:[
        {key:'beneficiaryMarriageCount',label:'¿Cuántas veces ha estado casado/a?',type:'number',source:'Part 4, Item 17'},
        {key:'beneficiaryMaritalStatus',label:'Estado civil actual',type:'radio',options:maritalStatusOptions,source:'Part 4, Item 18'},
        {key:'beneficiaryCurrentMarriageDate',label:'Fecha del matrimonio actual',type:'date',source:'Part 4, Item 19',visibleWhen:{field:'beneficiaryMaritalStatus',equals:'married'}},
        {key:'beneficiaryMarriageCity',label:'Ciudad donde se celebró el matrimonio',type:'text',source:'Part 4, Item 20.a',visibleWhen:{field:'beneficiaryMaritalStatus',equals:'married'}},
        {key:'beneficiaryMarriageState',label:'Estado',type:'text',source:'Part 4, Item 20.b',visibleWhen:{field:'beneficiaryMaritalStatus',equals:'married'}},
        {key:'beneficiaryMarriageProvince',label:'Provincia',type:'text',source:'Part 4, Item 20.c',visibleWhen:{field:'beneficiaryMaritalStatus',equals:'married'}},
        {key:'beneficiaryMarriageCountry',label:'País',type:'text',source:'Part 4, Item 20.d',visibleWhen:{field:'beneficiaryMaritalStatus',equals:'married'}},
        spouseRepeater('beneficiarySpouses','Cónyuge actual y cónyuges anteriores')
      ]},

      {id:'i130-part4-beneficiary-family',title:'Parte 4 · Beneficiario — Cónyuge e Hijos',fields:[
        {key:'beneficiaryFamilyMembers',label:'Cónyuge e hijos del beneficiario',type:'repeater',addLabel:'Agregar familiar',source:'Part 4, Items 25–44',maxItems:5,fields:[...nameFields('familyMember'),{key:'relationship',label:'Relación',type:'text'},{key:'dob',label:'Fecha de nacimiento',type:'date'},{key:'birthCountry',label:'País de nacimiento',type:'text'}]}
      ]},

      {id:'i130-part4-entry',title:'Parte 4 · Beneficiario — Entradas a Estados Unidos',fields:[
        {key:'beneficiaryEverInUS',label:'¿El beneficiario ha estado alguna vez en Estados Unidos?',type:'radio',options:yesNo,source:'Part 4, Item 45'},
        {key:'beneficiaryCurrentlyInUS',label:'¿El beneficiario se encuentra actualmente en Estados Unidos?',type:'radio',options:yesNo,visibleWhen:{field:'beneficiaryEverInUS',equals:'yes'}},
        {key:'beneficiaryClassOfAdmission',label:'Clase de admisión en la entrada más reciente',type:'text',source:'Part 4, Item 46.a',visibleWhen:{field:'beneficiaryCurrentlyInUS',equals:'yes'}},
        {key:'beneficiaryI94',label:'Número de I-94',type:'text',source:'Part 4, Item 46.b',visibleWhen:{field:'beneficiaryCurrentlyInUS',equals:'yes'}},
        {key:'beneficiaryArrivalDate',label:'Fecha de entrada más reciente',type:'date',source:'Part 4, Item 46.c',visibleWhen:{field:'beneficiaryCurrentlyInUS',equals:'yes'}},
        {key:'beneficiaryAuthorizedStayExpiration',label:'Fecha de vencimiento del período autorizado o D/S',type:'dateOrText',source:'Part 4, Item 46.d',visibleWhen:{field:'beneficiaryCurrentlyInUS',equals:'yes'}},
        {key:'beneficiaryPassportNumber',label:'Número de pasaporte',type:'text',source:'Part 4, Item 47'},
        {key:'beneficiaryTravelDocumentNumber',label:'Número de documento de viaje, si aplica',type:'text',source:'Part 4, Item 48'},
        {key:'beneficiaryPassportIssuingCountry',label:'País que emitió el pasaporte o documento de viaje',type:'text',source:'Part 4, Item 49'},
        {key:'beneficiaryPassportExpiration',label:'Fecha de vencimiento del pasaporte o documento de viaje',type:'date',source:'Part 4, Item 50'}
      ]},

      {id:'i130-part4-beneficiary-employment',title:'Parte 4 · Beneficiario — Empleo Actual',fields:[
        {key:'beneficiaryCurrentEmployer',label:'Nombre del empleador actual; si no trabaja, indicar “Unemployed”',type:'text',source:'Part 4, Item 51.a'},
        {key:'beneficiaryEmployerAddress',label:'Dirección del empleador',type:'group',source:'Part 4, Items 51.b–51.i',fields:addressFields('beneficiaryEmployer')},
        {key:'beneficiaryEmploymentStartDate',label:'Fecha en que comenzó ese empleo',type:'date',source:'Part 4, Item 52'}
      ]},

      {id:'i130-part4-proceedings',title:'Parte 4 · Beneficiario — Procedimientos Migratorios',fields:[
        {key:'beneficiaryEverInProceedings',label:'¿Ha estado alguna vez en procedimientos migratorios?',type:'radio',options:yesNo,source:'Part 4, Item 53'},
        {key:'beneficiaryProceedingType',label:'Tipo de procedimiento',type:'checkboxGroup',source:'Part 4, Item 54',visibleWhen:{field:'beneficiaryEverInProceedings',equals:'yes'},options:[{value:'removal',label:'Removal'},{value:'exclusionDeportation',label:'Exclusion / Deportation'},{value:'rescission',label:'Rescission'},{value:'otherJudicial',label:'Otro procedimiento judicial'}]},
        {key:'beneficiaryProceedingCity',label:'Ciudad del procedimiento',type:'text',source:'Part 4, Item 55.a',visibleWhen:{field:'beneficiaryEverInProceedings',equals:'yes'}},
        {key:'beneficiaryProceedingState',label:'Estado',type:'text',source:'Part 4, Item 55.b',visibleWhen:{field:'beneficiaryEverInProceedings',equals:'yes'}},
        {key:'beneficiaryProceedingDate',label:'Fecha del procedimiento',type:'date',source:'Part 4, Item 56',visibleWhen:{field:'beneficiaryEverInProceedings',equals:'yes'}}
      ]},

      {id:'i130-part4-native-language',title:'Parte 4 · Beneficiario — Escritura en Idioma Nativo',fields:[
        {key:'beneficiaryUsesNonRomanAlphabet',label:'¿Su idioma nativo utiliza un alfabeto distinto al romano?',type:'radio',options:yesNo},
        {key:'beneficiaryNativeScriptName',label:'Nombre completo escrito en su alfabeto nativo',type:'group',source:'Part 4, Item 57',visibleWhen:{field:'beneficiaryUsesNonRomanAlphabet',equals:'yes'},fields:nameFields('nativeScript')},
        {key:'beneficiaryNativeScriptAddress',label:'Dirección extranjera escrita en su alfabeto nativo',type:'textarea',source:'Part 4, Item 58',visibleWhen:{field:'beneficiaryUsesNonRomanAlphabet',equals:'yes'}}
      ]},

      {id:'i130-part4-spouse-joint-residence',title:'Parte 4 · Última Dirección donde Vivieron Juntos',visibleWhen:{field:'relationship',equals:'spouse'},fields:[
        {key:'spousesEverLivedTogether',label:'¿Han vivido físicamente juntos alguna vez?',type:'radio',options:yesNo},
        {key:'spousesLastJointAddress',label:'Última dirección donde vivieron físicamente juntos',type:'group',source:'Part 4, Item 59',visibleWhen:{field:'spousesEverLivedTogether',equals:'yes'},fields:addressFields('lastJoint')},
        {key:'spousesJointResidenceFrom',label:'Desde',type:'date',source:'Part 4, Item 60.a',visibleWhen:{field:'spousesEverLivedTogether',equals:'yes'}},
        {key:'spousesJointResidenceTo',label:'Hasta',type:'dateOrPresent',source:'Part 4, Item 60.b',visibleWhen:{field:'spousesEverLivedTogether',equals:'yes'}}
      ]},

      {id:'i130-part4-processing',title:'Parte 4 · Procesamiento de Residencia',fields:[
        {key:'beneficiaryProcessingType',label:'¿Cómo continuará el beneficiario el proceso de residencia?',type:'radio',options:[{value:'adjustment',label:'Ajuste de estatus dentro de Estados Unidos'},{value:'consular',label:'Visa de inmigrante mediante proceso consular'}]},
        {key:'adjustmentUSCISCity',label:'Ciudad de la oficina de USCIS',type:'text',source:'Part 4, Item 61.a',visibleWhen:{field:'beneficiaryProcessingType',equals:'adjustment'}},
        {key:'adjustmentUSCISState',label:'Estado',type:'text',source:'Part 4, Item 61.b',visibleWhen:{field:'beneficiaryProcessingType',equals:'adjustment'}},
        {key:'consularCity',label:'Ciudad de la embajada o consulado',type:'text',source:'Part 4, Item 62.a',visibleWhen:{field:'beneficiaryProcessingType',equals:'consular'}},
        {key:'consularProvince',label:'Provincia',type:'text',source:'Part 4, Item 62.b',visibleWhen:{field:'beneficiaryProcessingType',equals:'consular'}},
        {key:'consularCountry',label:'País',type:'text',source:'Part 4, Item 62.c',visibleWhen:{field:'beneficiaryProcessingType',equals:'consular'}}
      ]},

      {id:'i130-part5-prior-petitions',title:'Parte 5 · Otras Peticiones Presentadas por el Peticionario',fields:[
        {key:'petitionerEverFiledOtherPetition',label:'¿Ha presentado anteriormente una petición para este beneficiario o para otra persona extranjera?',type:'radio',options:yesNo,source:'Part 5, Item 1'},
        {key:'petitionerPriorPetitions',label:'Peticiones presentadas anteriormente',type:'repeater',addLabel:'Agregar petición anterior',visibleWhen:{field:'petitionerEverFiledOtherPetition',equals:'yes'},fields:[...nameFields('beneficiary'),{key:'filingCity',label:'Ciudad donde se presentó',type:'text'},{key:'filingState',label:'Estado',type:'text'},{key:'filingDate',label:'Fecha de presentación',type:'date'},{key:'result',label:'Resultado: aprobado, negado, retirado u otro',type:'text'}]},
        {key:'simultaneousRelativePetitions',label:'Otros familiares para quienes presenta peticiones separadas al mismo tiempo',type:'repeater',addLabel:'Agregar familiar',source:'Part 5, Items 6–9',fields:[...nameFields('relative'),{key:'relationship',label:'Relación familiar',type:'text'}]}
      ]},

      {id:'i130-part6-statement',title:'Parte 6 · Declaraciones y Contacto del Peticionario',fields:[
        {key:'petitionerCanReadEnglish',label:'¿Puede leer y entender inglés suficientemente para revisar el formulario?',type:'radio',options:yesNo},
        {key:'petitionerUsedInterpreter',label:'¿Utilizó intérprete para completar o revisar el formulario?',type:'radio',options:yesNo},
        {key:'petitionerInterpreterLanguage',label:'Idioma utilizado por el intérprete',type:'text',visibleWhen:{field:'petitionerUsedInterpreter',equals:'yes'}},
        {key:'petitionerUsedPreparer',label:'¿Otra persona preparó el formulario basado en la información del peticionario?',type:'radio',options:yesNo},
        {key:'petitionerDayPhone',label:'Teléfono durante el día',type:'tel',source:'Part 6, Item 3'},
        {key:'petitionerMobilePhone',label:'Teléfono celular',type:'tel',source:'Part 6, Item 4'},
        {key:'petitionerEmail',label:'Correo electrónico',type:'email',source:'Part 6, Item 5'},
        {key:'petitionerCertificationAcknowledged',label:'El peticionario confirma que revisará la versión final antes de firmarla',type:'checkbox',required:true,intakeOnly:true}
      ]},

      {id:'i130-part7-interpreter',title:'Parte 7 · Intérprete',visibleWhen:{field:'petitionerUsedInterpreter',equals:'yes'},fields:[...nameFields('interpreter'),{key:'interpreterBusiness',label:'Empresa u organización',type:'text'},{key:'interpreterMailingAddress',label:'Dirección postal',type:'group',fields:addressFields('interpreter')},{key:'interpreterDayPhone',label:'Teléfono',type:'tel'},{key:'interpreterMobilePhone',label:'Teléfono celular',type:'tel'},{key:'interpreterEmail',label:'Correo electrónico',type:'email'},{key:'interpreterLanguage',label:'Idioma que interpreta',type:'text'}]},

      {id:'i130-part8-preparer',title:'Parte 8 · Preparador',audience:'agr',fields:[...nameFields('preparer'),{key:'preparerBusiness',label:'Empresa u organización',type:'text',defaultValue:'AGR Solutions LLC'},{key:'preparerMailingAddress',label:'Dirección postal',type:'group',fields:addressFields('preparer')},{key:'preparerDayPhone',label:'Teléfono',type:'tel'},{key:'preparerMobilePhone',label:'Teléfono celular',type:'tel'},{key:'preparerEmail',label:'Correo electrónico',type:'email'},{key:'preparerType',label:'Tipo de preparador',type:'radio',options:[{value:'nonAttorney',label:'Preparador que no es abogado ni representante acreditado'},{value:'attorneyOrAccredited',label:'Abogado o representante acreditado'}]}]},

      {id:'i130-part9-additional',title:'Parte 9 · Información Adicional',fields:[{key:'i130AdditionalInformation',label:'Información adicional',type:'repeater',addLabel:'Agregar información',fields:[{key:'pageNumber',label:'Página relacionada',type:'text'},{key:'partNumber',label:'Parte relacionada',type:'text'},{key:'itemNumber',label:'Número de pregunta',type:'text'},{key:'details',label:'Información adicional',type:'textarea'}]}]}
    ]
  };

  const I130A={
    id:'I-130A',title:'Información Suplementaria para Beneficiario Cónyuge',edition:'04/01/24',officialForm:'I-130A',usedWhen:{parentForm:'I-130',field:'relationship',equals:'spouse'},
    sections:[
      {id:'i130a-part1-identification',title:'I-130A Parte 1 · Beneficiario Cónyuge',fields:[{key:'spouseBeneficiaryANumber',label:'A-Number, si tiene',type:'text',source:'Part 1, Item 1'},{key:'spouseBeneficiaryUSCISAccountNumber',label:'USCIS Online Account Number, si tiene',type:'text',source:'Part 1, Item 2'},...nameFields('spouseBeneficiary')]},
      {id:'i130a-part1-address-history',title:'I-130A Parte 1 · Historial de Direcciones',description:'Todas las direcciones físicas de los últimos 5 años.',fields:[{key:'spouseBeneficiaryAddressHistory',label:'Historial de direcciones de los últimos 5 años',type:'repeater',addLabel:'Agregar dirección',source:'Part 1, Items 4–7',fields:[...addressFields('physical'),{key:'dateFrom',label:'Desde',type:'date'},{key:'dateTo',label:'Hasta',type:'dateOrPresent'}]},{key:'spouseBeneficiaryLastForeignAddressOverOneYear',label:'Última dirección fuera de Estados Unidos donde vivió durante más de un año',type:'group',source:'Part 1, Item 8',fields:addressFields('lastForeign')},{key:'spouseBeneficiaryLastForeignAddressFrom',label:'Desde',type:'date',source:'Part 1, Item 9.a'},{key:'spouseBeneficiaryLastForeignAddressTo',label:'Hasta',type:'dateOrPresent',source:'Part 1, Item 9.b'}]},
      {id:'i130a-part1-parents',title:'I-130A Parte 1 · Padres del Beneficiario Cónyuge',fields:[...parentFields('spouseBeneficiaryParent1',1),...parentFields('spouseBeneficiaryParent2',2)]},
      {id:'i130a-part2-employment',title:'I-130A Parte 2 · Historial de Empleo',description:'Todos los empleos de los últimos 5 años.',fields:[employmentRepeater('spouseBeneficiaryEmploymentHistory','Historial de empleo de los últimos 5 años')]},
      {id:'i130a-part3-foreign-employment',title:'I-130A Parte 3 · Último Empleo Fuera de Estados Unidos',fields:[{key:'spouseBeneficiaryForeignEmploymentAlreadyListed',label:'¿El último empleo fuera de Estados Unidos ya aparece en el historial anterior?',type:'radio',options:yesNo},{key:'spouseBeneficiaryLastForeignEmployer',label:'Último empleo fuera de Estados Unidos',type:'group',visibleWhen:{field:'spouseBeneficiaryForeignEmploymentAlreadyListed',equals:'no'},fields:[{key:'employerName',label:'Nombre del empleador o compañía',type:'text'},...addressFields('employerAddress'),{key:'occupation',label:'Ocupación',type:'text'},{key:'dateFrom',label:'Desde',type:'date'},{key:'dateTo',label:'Hasta',type:'dateOrPresent'}]}]},
      {id:'i130a-part4-statement',title:'I-130A Parte 4 · Declaración y Contacto del Beneficiario Cónyuge',fields:[{key:'spouseBeneficiaryCanReadEnglish',label:'¿Puede leer y entender inglés suficientemente para revisar el formulario?',type:'radio',options:yesNo},{key:'spouseBeneficiaryUsedInterpreter',label:'¿Utilizó intérprete?',type:'radio',options:yesNo},{key:'spouseBeneficiaryInterpreterLanguage',label:'Idioma utilizado',type:'text',visibleWhen:{field:'spouseBeneficiaryUsedInterpreter',equals:'yes'}},{key:'spouseBeneficiaryUsedPreparer',label:'¿Otra persona preparó el formulario?',type:'radio',options:yesNo},{key:'spouseBeneficiaryDayPhone',label:'Teléfono durante el día',type:'tel'},{key:'spouseBeneficiaryMobilePhone',label:'Teléfono celular',type:'tel'},{key:'spouseBeneficiaryEmail',label:'Correo electrónico',type:'email'},{key:'spouseBeneficiaryLivesOutsideUS',label:'¿El beneficiario cónyuge reside actualmente fuera de Estados Unidos?',type:'radio',options:yesNo},{key:'spouseBeneficiaryCertificationAcknowledged',label:'El beneficiario cónyuge confirma que revisará la versión final antes de firmarla',type:'checkbox',intakeOnly:true,required:true}]},
      {id:'i130a-part5-interpreter',title:'I-130A Parte 5 · Intérprete',visibleWhen:{field:'spouseBeneficiaryUsedInterpreter',equals:'yes'},fields:[...nameFields('spouseInterpreter'),{key:'spouseInterpreterBusiness',label:'Empresa u organización',type:'text'},{key:'spouseInterpreterAddress',label:'Dirección postal',type:'group',fields:addressFields('spouseInterpreter')},{key:'spouseInterpreterDayPhone',label:'Teléfono',type:'tel'},{key:'spouseInterpreterMobilePhone',label:'Teléfono celular',type:'tel'},{key:'spouseInterpreterEmail',label:'Correo electrónico',type:'email'},{key:'spouseInterpreterLanguage',label:'Idioma que interpreta',type:'text'}]},
      {id:'i130a-part6-preparer',title:'I-130A Parte 6 · Preparador',audience:'agr',fields:[...nameFields('spousePreparer'),{key:'spousePreparerBusiness',label:'Empresa u organización',type:'text',defaultValue:'AGR Solutions LLC'},{key:'spousePreparerAddress',label:'Dirección postal',type:'group',fields:addressFields('spousePreparer')},{key:'spousePreparerDayPhone',label:'Teléfono',type:'tel'},{key:'spousePreparerMobilePhone',label:'Teléfono celular',type:'tel'},{key:'spousePreparerEmail',label:'Correo electrónico',type:'email'},{key:'spousePreparerType',label:'Tipo de preparador',type:'radio',options:[{value:'nonAttorney',label:'Preparador que no es abogado ni representante acreditado'},{value:'attorneyOrAccredited',label:'Abogado o representante acreditado'}]}]},
      {id:'i130a-part7-additional',title:'I-130A Parte 7 · Información Adicional',fields:[{key:'i130aAdditionalInformation',label:'Información adicional',type:'repeater',addLabel:'Agregar información',fields:[{key:'pageNumber',label:'Página relacionada',type:'text'},{key:'partNumber',label:'Parte relacionada',type:'text'},{key:'itemNumber',label:'Número de pregunta',type:'text'},{key:'details',label:'Información adicional',type:'textarea'}]}]}
    ]
  };

  window.AGR_USCIS_SCHEMAS=Object.freeze({'I-130':I130,'I-130A':I130A});
  console.log('AGR USCIS Intake Schemas cargados:',Object.keys(window.AGR_USCIS_SCHEMAS));
})();
