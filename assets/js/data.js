/* =============================================================================
   data.js — dataset captured from bandy.ai (material.trendingList +
   category.getList). Stored as compact tuples to keep the payload small, then
   expanded into objects at load time.

   Gallery tuple: [file, "<Category> - <Persona>", favourites, taskType]
   `file` is relative to CDN_BASE.
   ========================================================================== */
(function (global) {
  'use strict';

  var CDN_BASE = 'https://mediacdn.bandy.ai/web-cdn/bandy/production/default/inspiration/';
  function img(file) { return CDN_BASE + file; }

  /* --------------------------------------------------------------- categories
     Order mirrors the chip row on the live Swap Model & BG page. */
  var CATEGORIES = [
    'Dresses', 'Skirts', 'Shapewear', 'Jumpsuits & Rompers', 'Leggings',
    'Sunglasses', 'Shirts', 'Shorts', 'Tank Tops', 'Swimwear', 'Coats & Jackets',
    'T-shirts', 'Activewear', 'Earrings', 'Necklaces', 'Socks', 'Rings',
    'Bracelets', 'Sweatshirts', 'Underwear', 'Pants', 'Hoodies',
    'Sleepwear & Loungewear', 'Polos', 'Plus Size', 'Handbags', 'Watches',
    'Hats', 'Footwear', 'Jewelry', 'Beauty & Personal Care', 'Sports & Outdoor',
    'Tech & Electronics', 'Maternity & Baby Products', 'Drinkware', 'Beverages',
    'Perfume', 'Food', 'Vitamins & Supplements', 'Kitchenware'
  ];

  /* Raw name prefix -> canonical chip label. */
  var CATEGORY_ALIASES = { 'Sleepwear': 'Sleepwear & Loungewear' };

  /* ------------------------------------------------------------------ gallery */
  var RAW = [
    ['1754549064229-28670bde-7cd3-4a47-ba18-a3400c959d7d.webp', 'Shapewear - Young lady', 8, 'TryOnClothing'],
    ['1754532293649-c5cc3de9-19e5-4cc6-8521-79b814d67c07.webp', 'Swimwear - Young lady', 4, 'TryOnClothing'],
    ['1754535526370-0dcb5e25-bdc4-48cf-8838-895595cfce69.webp', 'Dresses - Young lady', 0, 'TryOnClothing'],
    ['1754532777220-bf871520-ec5e-4bfe-b697-5dead755f11a.webp', 'Hats - Young lady', 1, 'TryOnAccessories'],
    ['1754554423446-4c4dbed5-3786-473d-9858-cc90e9ef7e5f.webp', 'Bracelets - Young lady', 2, 'TryOnAccessories'],
    ['1754548713805-0350cd8f-8b2c-4c51-84e6-20c690d8ddbf.webp', 'Handbags - Young lady', 0, 'TryOnAccessories'],
    ['1754554324009-24a2c70f-5394-4fa9-b9c9-7534fe1468ef.webp', 'Jumpsuits & Rompers - Young lady', 2, 'TryOnClothing'],
    ['1754551264086-a2852cda-58a0-4d6c-ab2f-c2c38b1778ac.webp', 'Dresses - Little girl', 17, 'TryOnClothing'],
    ['1754549101031-3431e167-eda6-45dc-8561-b7bd528949b7.webp', 'Necklaces - Young lady', 3, 'TryOnAccessories'],
    ['1754533396860-affecc2a-4db6-4aca-80ee-0ac01d9c529c.webp', 'Shorts - Young lady', 18, 'TryOnClothing'],
    ['1754551378904-6d5793e1-7a22-4f7d-898f-4a9e225f3f7d.webp', 'Skirts - Young lady', 22, 'TryOnClothing'],
    ['1754554635351-4129111d-6524-4368-bc86-83a91de89dbb.webp', 'Socks - Young lady', 0, 'TryOnAccessories'],
    ['1754535276285-6a3dd43d-28d9-4dcd-ac39-c52a3569b737.webp', 'Dresses - Young lady', 19, 'TryOnClothing'],
    ['1754551736030-037b4036-5d85-43f7-9640-47ef5c522782.webp', 'Hoodies - Young lady', 2, 'TryOnClothing'],
    ['1754554508874-76a6c551-da34-4f8b-9085-6811acd0b815.webp', 'Polos - Young man', 0, 'TryOnClothing'],
    ['1754551781277-f13d7ecb-4c0c-4085-aba8-ce7cbe45cc53.webp', 'Coats & Jackets - Young lady', 0, 'TryOnClothing'],
    ['1754554798379-fb20b786-6d8f-40ba-bdb3-3763b36aa713.webp', 'Sweatshirts - Young lady', 2, 'TryOnClothing'],
    ['1754536065171-860a0586-c799-4262-9741-e6062e940030.webp', 'Sweatshirts - Young lady', 1, 'TryOnClothing'],
    ['1754553874228-ea5be852-1ec4-48ff-8e7a-1765bd9acd8f.webp', 'Skirts - Young lady', 2, 'TryOnClothing'],
    ['1754549352175-4477eb68-e400-41fd-8012-bce59538dfb7.webp', 'Sunglasses - Young lady', 1, 'TryOnAccessories'],
    ['1754550102111-bb350f02-2f5b-4916-86d6-ac924fb5ea34.webp', 'Shapewear - Young lady', 0, 'TryOnClothing'],
    ['1754534275539-263c7104-c9fb-43cf-a52e-28504ad5c992.webp', 'Socks - Young lady', 0, 'TryOnAccessories'],
    ['1754549915850-919f32cf-df10-4a35-8c8d-bce6bf402ee8.webp', 'Tank Tops - Young lady', 2, 'TryOnClothing'],
    ['1754550285654-c6b697ec-6000-49ce-960e-656ce44a6a06.webp', 'Tank Tops - Young lady', 0, 'TryOnClothing'],
    ['1754554341581-48ed4847-a18c-4c04-9ca6-e3c409b0e82d.webp', 'Sunglasses - Young man', 0, 'TryOnAccessories'],
    ['1754554437095-d0fcce8a-e38c-4b52-9350-efc922674e14.webp', 'Leggings - Young lady', 1, 'TryOnClothing'],
    ['1754550781402-de2601c9-0934-49f7-9e60-6b9441f9a737.webp', 'Earrings - Young lady', 0, 'TryOnAccessories'],
    ['1754549763890-d981bb46-1b0a-428e-9ff6-d223c1a98887.webp', 'Tank Tops - Young lady', 0, 'TryOnClothing'],
    ['1754549498344-60c0de1f-cb4e-462b-a342-2a1feafd191a.webp', 'Shapewear - Young lady', 0, 'TryOnClothing'],
    ['1754549189923-f9f634ee-5ba1-45ac-aa4a-75b6b7173720.webp', 'Rings - Young lady', 1, 'TryOnAccessories'],
    ['1754532318500-0a061a30-07ed-4172-9c12-0a0d4751e2a2.webp', 'Shorts - Young lady', 0, 'TryOnClothing'],
    ['1754548704956-e929e375-beaa-4b3c-a22b-9b9a5223cc55.webp', 'Vitamins & Supplements - Young lady', 1, 'ProductInHand'],
    ['1754548919792-c58bb24b-76f9-4c27-a826-0093b7d9e464.webp', 'Rings - Young lady', 0, 'TryOnAccessories'],
    ['1754532638825-e1f61d1e-3416-4b9c-b67c-d7555c86e488.webp', 'Watches - Young lady', 1, 'TryOnAccessories'],
    ['1754554339484-a161fc71-94a0-4ea0-aa6a-4ccba9c758f3.webp', 'Sunglasses - Young lady', 0, 'TryOnAccessories'],
    ['1754554107262-d67be95b-9905-4f4c-b923-3423c667804a.webp', 'Beauty & Personal Care - Young lady', 0, 'ProductInHand'],
    ['1754550487247-145ec4e1-8cf1-4f95-8f02-040d9f3761d8.webp', 'Coats & Jackets - Young lady', 20, 'TryOnClothing'],
    ['1754551380730-e4bea983-29d7-4c3b-aabd-d4119d205313.webp', 'Skirts - Young lady', 5, 'TryOnClothing'],
    ['1754550218364-f3075358-cc15-428f-9259-4d1aa3f55726.webp', 'T-shirts - Young lady', 4, 'TryOnClothing'],
    ['1754549167651-e461d9e1-740d-4106-a4f8-8c89e9d5090e.webp', 'Hoodies - Young lady', 4, 'TryOnClothing'],
    ['1754550898981-2e321acb-f8d1-4e33-8b49-c72214d7a2be.webp', 'Shorts - Young man', 3, 'TryOnClothing'],
    ['1754549685222-3e4ce0f6-a52c-40a8-864f-4da9df5aa393.webp', 'Coats & Jackets - Young lady', 2, 'TryOnClothing'],
    ['1754554667010-10615e82-e58a-4496-8cbc-d72d411e3d0f.webp', 'Dresses - Young lady', 92, 'TryOnClothing'],
    ['1754548166234-90eb2c5c-3c13-46c1-840f-0bfbb9a40516.webp', 'Beauty & Personal Care - Young lady', 3, 'ProductInHand'],
    ['1754549222872-95d6d790-46d9-46b2-8098-c410f1ab83cd.webp', 'Sweatshirts - Young lady', 3, 'TryOnClothing'],
    ['1754535677404-19b922fd-45c2-44ba-a144-9c48a681c243.webp', 'Rings - Young lady', 3, 'TryOnAccessories'],
    ['1754551807556-a64728ef-5305-4b16-91b8-78e37a3b26af.webp', 'Activewear - Young man', 3, 'TryOnClothing'],
    ['1754548709243-057a9d5c-cea4-4b30-8097-3051097c1f07.webp', 'Footwear - Young lady', 1, 'ProductInHand'],
    ['1754547983069-9d5b3bb7-acf3-40f7-96f7-8f725a4749cd.webp', 'Sports & Outdoor - Young lady', 1, 'ProductInHand'],
    ['1754547692601-8e4a5c96-8768-4e73-bf35-3739b1aba0ce.webp', 'Food - Young lady', 1, 'ProductInHand'],
    ['1754549092574-d4cc29d1-11af-4346-94bd-df43e493d540.webp', 'Necklaces - Young lady', 1, 'TryOnAccessories'],
    ['1754534425154-13b18a2a-647e-42ee-b4fc-1550dde1c913.webp', 'Dresses - Young lady', 17, 'TryOnClothing'],
    ['1754554520654-b8f34e7c-659c-4f49-bd48-1b9a4b9859fe.webp', 'Swimwear - Young lady', 2, 'TryOnClothing'],
    ['1754550387092-494d71dc-69d6-4e3d-9a72-cf3ec9b8e85a.webp', 'Pants - Young lady', 2, 'TryOnClothing'],
    ['1754549691979-fe0521b8-7057-42ba-b718-db4b971f5173.webp', 'T-shirts - Young man', 1, 'TryOnClothing'],
    ['1754548608654-e622222c-c8fb-4ec8-ae88-bbfa23abcc8c.webp', 'Beauty & Personal Care - Young lady', 2, 'ProductInHand'],
    ['1754551307070-068d2180-8b3c-4d64-9cd0-6d8dc5adca72.webp', 'Skirts - Young lady', 1, 'TryOnClothing'],
    ['1754535509616-0e37d45f-f958-48cc-b8b1-26d00596aed4.webp', 'Skirts - Young lady', 17, 'TryOnClothing'],
    ['1754535237396-1853cbef-fad0-468d-ab9d-8255d37296ce.webp', 'Earrings - Young lady', 2, 'TryOnAccessories'],
    ['1754535154906-d1ae9d23-4736-418b-a328-f86c0a5d3f19.webp', 'Sunglasses - Young lady', 2, 'TryOnAccessories'],
    ['1754534232411-77924949-6138-4143-932d-018a34bf20f5.webp', 'Dresses - Young lady', 2, 'TryOnClothing'],
    ['1754532347180-7092a4e3-e841-4b37-9258-9d26cbc7cb4f.webp', 'Sunglasses - Young lady', 2, 'TryOnAccessories'],
    ['1754531457594-88d0d168-0e7a-4e7a-b076-93a87b7bbf09.webp', 'Sunglasses - Young lady', 92, 'TryOnAccessories'],
    ['1754538106817-5e6566f9-03ef-4266-8480-6bf682c771a5.webp', 'Beauty & Personal Care - Young man', 2, 'ProductInHand'],
    ['1754547987240-57711104-b985-487c-ace2-78dbc01d8927.webp', 'Activewear - Young man', 2, 'TryOnClothing'],
    ['1754547889129-581a3bf6-4ec2-4371-b80f-cbdedfe02141.webp', 'Activewear - Young man', 17, 'TryOnClothing'],
    ['1754531466531-bcdd1d6a-f0a9-4b51-bce7-91bfe4b444a5.webp', 'Sunglasses - Young lady', 2, 'TryOnAccessories'],
    ['1754534393854-14979d41-de38-4d6e-8012-acae92b99ca0.webp', 'Dresses - Young lady', 91, 'TryOnClothing'],
    ['1754554584484-d06d9e39-3fd4-4416-9aad-08c758f82258.webp', 'Activewear - Young man', 17, 'TryOnClothing'],
    ['1754554449153-861728a6-14be-4598-a58b-14a12688493e.webp', 'Food - Young lady', 2, 'ProductInHand'],
    ['1754550927677-c9cb7384-71d3-4c7d-bbe3-c1732773ef6f.webp', 'Handbags - Young lady', 1, 'TryOnAccessories'],
    ['1754550164937-2215712a-5eb1-4e7a-b70c-c7403f8ad2af.webp', 'Leggings - Young lady', 1, 'TryOnClothing'],
    ['1754550100027-b1eba83b-d5d9-44d0-b166-153500b03e1c.webp', 'Sunglasses - Young man', 1, 'TryOnAccessories'],
    ['1754549910479-d9242d08-6bf0-40fa-812b-88b7d9019385.webp', 'Pants - Young lady', 1, 'TryOnClothing'],
    ['1754549381867-c887b8f4-5b1f-44bb-971d-675899d6df88.webp', 'Sweatshirts - Young lady', 1, 'TryOnClothing'],
    ['1754548858181-fd0f920d-4e43-4f5a-9956-a1c23dd0bebe.webp', 'Beauty & Personal Care - Young lady', 0, 'ProductInHand'],
    ['1754548496378-8f7366e2-bba0-4748-aa7d-4d065a07f327.webp', 'Tank Tops - Young man', 1, 'TryOnClothing'],
    ['1754548459482-1ef4ab65-4556-478f-9e39-1578110a4d78.webp', 'Underwear - Young lady', 1, 'TryOnClothing'],
    ['1754547870429-29d2b4a9-1641-4f48-9841-8f0af436ec85.webp', 'Footwear - Young lady', 1, 'ProductInHand'],
    ['1754548583037-aa439f03-04e1-4c15-a82d-05a79d858f42.webp', 'Earrings - Young lady', 0, 'TryOnAccessories'],
    ['1754548518705-df093b3c-6614-4c21-a512-4216053b034b.webp', 'Vitamins & Supplements - Young lady', 1, 'ProductInHand'],
    ['1754549269882-e28cd83a-584d-442e-86a6-7da9c58f7141.webp', 'Swimwear - Young man', 0, 'TryOnClothing'],
    ['1754548947878-3112f3c7-9464-4b44-8f87-76d382a89ad1.webp', 'Sunglasses - Young lady', 1, 'TryOnAccessories'],
    ['1754550361749-1aa2d64d-7925-4772-a38b-46dc91af94be.webp', 'Tech & Electronics - Young man', 1, 'ProductInHand'],
    ['1754550260254-105acda8-6251-4372-b5e2-7574c97c198c.webp', 'Sleepwear - Little boy', 1, 'TryOnClothing'],
    ['1754554868422-f26ef311-5abe-42ed-adac-b4b3e118f549.webp', 'Plus Size - Young lady', 1, 'TryOnClothing'],
    ['1754554787102-36804dfe-8e0b-4f9d-81f7-68f3d5e6f06a.webp', 'Sleepwear - Little boy', 1, 'TryOnClothing'],
    ['1754554781748-495c82ce-99a4-48c2-8d21-4e26ee7866e4.webp', 'Skirts - Young lady', 1, 'TryOnClothing'],
    ['1754554752322-28595e75-f4b4-4302-97ba-004d50a3bf2e.webp', 'Sweatshirts - Young lady', 1, 'TryOnClothing'],
    ['1754554736593-b36376c7-76f9-40b3-94e1-ad64adec4581.webp', 'Coats & Jackets - Young man', 2, 'TryOnClothing'],
    ['1754549556415-093563e3-40df-4e0d-b9fb-c0e5a3d85802.webp', 'Skirts - Young lady', 91, 'TryOnClothing'],
    ['1754549397791-26a2d3c8-805b-4332-8b98-c7bbd4829288.webp', 'T-shirts - Young man', 1, 'TryOnClothing'],
    ['1754551791447-b0cfa32b-298c-4384-ba75-d37b940cf98d.webp', 'Hoodies - Young lady', 1, 'TryOnClothing'],
    ['1754551651799-bd979ba6-79c2-4150-b841-a36a24e0d9c1.webp', 'Rings - Young man', 0, 'TryOnAccessories'],
    ['1754554597131-4f7c2115-183f-46a8-87dd-c15a34958f95.webp', 'Shapewear - Young lady', 0, 'TryOnClothing'],
    ['1754536286793-d1ffc786-c568-4de4-a596-69550e5bbc96.webp', 'Socks - Young lady', 1, 'TryOnAccessories'],
    ['1754535404523-a68d1dd4-f3b2-4409-9b95-aacd12383acb.webp', 'Sweatshirts - Young lady', 0, 'TryOnClothing'],
    ['1754535079537-07e5c97a-e09a-4037-bc32-80e87b1d82b8.webp', 'Shapewear - Young lady', 0, 'TryOnClothing'],
    ['1754534330536-9832ffa1-b6d8-4254-9e03-c99cb4f20185.webp', 'Leggings - Young lady', 1, 'TryOnClothing'],
    ['1754534143124-c050b7ad-42c0-49e7-936f-2dd8f9d338ec.webp', 'Beauty & Personal Care - Young lady', 1, 'ProductInHand'],
    ['1754533426819-fb6658ba-5ce8-42b8-ab12-cae88f568129.webp', 'Earrings - Young lady', 0, 'TryOnAccessories'],
    ['1754532999490-b42b498b-5805-44c4-b429-27e78849671b.webp', 'Coats & Jackets - Young lady', 1, 'TryOnClothing'],
    ['1754531904445-8486ea3f-040a-436c-80a7-e6fae13c508f.webp', 'Earrings - Young lady', 0, 'TryOnAccessories'],
    ['1754554062402-fc29c803-8383-482e-945c-6dd1357774d1.webp', 'Skirts - Little girl', 1, 'TryOnClothing'],
    ['1754554490434-60026f02-e61f-4633-9942-6da476764efc.webp', 'Tech & Electronics - Young man', 1, 'ProductInHand'],
    ['1754554429140-254f3853-d16f-4daa-822d-e8166592d158.webp', 'Beverages - Young man', 1, 'ProductInHand'],
    ['1754554455586-e4b1d063-dec0-4c6a-aa06-7ab871f93e96.webp', 'Skirts - Young lady', 1, 'TryOnClothing'],
    ['1754554376911-515a0965-2f66-4f0a-9009-d0082b46e21c.webp', 'Dresses - Middle aged lady', 1, 'TryOnClothing'],
    ['1754554587018-f9ac732b-fe00-4cd5-a73b-ec3b14054eed.webp', 'Tech & Electronics - Young man', 1, 'ProductInHand'],
    ['1754554492847-b1df7ca9-492d-4457-b239-47ab773d1560.webp', 'Vitamins & Supplements - Young lady', 0, 'ProductInHand'],
    ['1754549203556-972fe748-2624-429c-8bcd-aa648b4527f3.webp', 'Skirts - Young lady', 1, 'TryOnClothing'],
    ['1754550866925-b730d74c-3e3c-41f6-8533-6ee36819acb5.webp', 'Tank Tops - Young lady', 0, 'TryOnClothing'],
    ['1754550731108-f9c2f3fd-b1c7-4642-bf54-6b8eb5a33f33.webp', 'Necklaces - Young lady', 0, 'TryOnAccessories'],
    ['1754550424971-6a334abc-1d8d-4d25-acdc-5a802f255313.webp', 'Handbags - Young lady', 0, 'TryOnAccessories'],
    ['1754550381345-ecdbb5e4-8281-4f40-aa48-f6904356cf62.webp', 'Necklaces - Young man', 1, 'TryOnAccessories'],
    ['1754549900792-019c3e52-c261-4ea8-8776-45a0451a1dce.webp', 'T-shirts - Young lady', 1, 'TryOnClothing'],
    ['1754549850718-1e77a8b5-50da-49e4-bb89-b03c42a85be4.webp', 'Dresses - Young lady', 0, 'TryOnClothing'],
    ['1754549848553-00330eb2-7d06-4998-923b-f95ebb402618.webp', 'Sports & Outdoor - Young man', 1, 'ProductInHand'],
    ['1754549785529-2fcf2cf6-dc06-4fcf-9875-fbfabc0623f7.webp', 'Dresses - Young lady', 1, 'TryOnClothing'],
    ['1754549655133-802433c7-e44b-444e-b067-99ed697108de.webp', 'Dresses - Young lady', 92, 'TryOnClothing'],
    ['1754549605862-56d67f15-37ae-4e5e-9e3a-1da1168ab8d2.webp', 'Swimwear - Young lady', 0, 'TryOnClothing'],
    ['1754551030443-7a46593b-c6f0-4508-b83f-e716d7549920.webp', 'Dresses - Little girl', 1, 'TryOnClothing'],
    ['1754548718365-509a3efd-e9e4-406a-9693-02ff24ca0396.webp', 'Watches - Young man', 1, 'ProductInHand'],
    ['1754548736529-a9d78294-3379-4d18-a68d-81b3c7c5d174.webp', 'Footwear - Young lady', 1, 'ProductInHand'],
    ['1754549250514-0bdd25be-9bd0-410e-87ef-0dc4319c2ef7.webp', 'Dresses - Young lady', 1, 'TryOnClothing'],
    ['1754548376856-e042eb13-1486-494f-8562-c762d368cc2d.webp', 'Food - Young lady', 1, 'ProductInHand'],
    ['1754548192712-f488ffc2-fbd2-4286-9244-a0825b8ba35a.webp', 'Drinkware - Young lady', 1, 'ProductInHand'],
    ['1754548140962-3e6618f3-4d85-467b-9c59-45a56b1dc9e9.webp', 'Shapewear - Young lady', 0, 'TryOnClothing'],
    ['1754548207942-5ac29bbf-298d-4d35-b37e-ae67afe7a67e.webp', 'Shirts - Middle aged lady', 1, 'TryOnClothing'],
    ['1754548661003-91640a13-c2b1-4679-99c3-1ff828c1022a.webp', 'Sweatshirts - Young lady', 1, 'TryOnClothing'],
    ['1754547979348-69ebc282-f6f9-455c-bf8b-31f2deae7ad2.webp', 'Perfume - Young lady', 1, 'ProductInHand'],
    ['1754547985128-6326ed4b-87be-4cec-a4cd-57b3e6167dda.webp', 'Perfume - Young man', 1, 'ProductInHand'],
    ['1754548633254-cf1e0019-45a8-4cfc-b4a0-e9201f1749b4.webp', 'Sports & Outdoor - Young lady', 1, 'ProductInHand'],
    ['1754547943563-e7d397c5-ec65-4018-ab17-0f4de19e2bf6.webp', 'Maternity & Baby Products - Young lady', 1, 'ProductInHand'],
    ['1754548626815-9aa44feb-42ad-449a-bcdc-847652f4a6d3.webp', 'Food - Young lady', 0, 'ProductInHand'],
    ['1754554414042-a1b947b5-e1f7-4b50-a259-2a4fe099e7db.webp', 'Dresses - Young lady', 90, 'TryOnClothing'],
    ['1754547900903-bf11ebc8-2cfc-4231-b359-307d2ff24597.webp', 'Jewelry - Young lady', 1, 'ProductInHand'],
    ['1754547896111-6f9a69e5-36d8-405b-9ddc-d005d9c727c5.webp', 'Kitchenware - Young lady', 1, 'ProductInHand'],
    ['1754551429948-7f685c3f-6bd4-4078-9b51-ca2c96d8720c.webp', 'Pants - Young lady', 1, 'TryOnClothing'],
    ['1754547828801-0c07bd01-0c03-4017-a04b-e212ef86fdac.webp', 'Beverages - Young lady', 1, 'ProductInHand'],
    ['1754533236385-bb0e144d-b6eb-4187-aece-48e69efb86fe.webp', 'Dresses - Little girl', 1, 'TryOnClothing'],
    ['1754547784020-a3755eff-1d24-420f-ba3e-36fead6034cc.webp', 'Drinkware - Young lady', 1, 'ProductInHand']
  ];

  /* Card aspect ratios (width / height), cycled deterministically so the
     masonry staggers identically on every load — no layout jump on re-render. */
  var ASPECTS = [0.666, 0.75, 0.8, 0.666, 1, 0.714, 0.75, 0.666, 0.8, 1, 0.666, 0.75];

  var GALLERY = RAW.map(function (row, i) {
    var parts = row[1].split(' - ');
    var rawCategory = parts[0];
    return {
      id: 'mat_' + i,
      url: img(row[0]),
      name: row[1],
      category: CATEGORY_ALIASES[rawCategory] || rawCategory,
      persona: parts[1] || 'Young lady',
      favourites: row[2],
      taskType: row[3],
      aspect: ASPECTS[i % ASPECTS.length],
      favourited: false
    };
  });

  /* ------------------------------------------------------------------- models
     Sidebar model library. Thumbnails reuse full-body shots from the dataset. */
  var MODELS = [
    { id: 'm01', name: 'Ava',    gender: 'Female', age: 'Adult',  body: 'Slim',     region: 'Latina',    thumb: img('1754554667010-10615e82-e58a-4496-8cbc-d72d411e3d0f.webp') },
    { id: 'm02', name: 'Mia',    gender: 'Female', age: 'Adult',  body: 'Average',  region: 'Caucasian', thumb: img('1754549556415-093563e3-40df-4e0d-b9fb-c0e5a3d85802.webp') },
    { id: 'm03', name: 'Zoe',    gender: 'Female', age: 'Adult',  body: 'Slim',     region: 'Asian',     thumb: img('1754534393854-14979d41-de38-4d6e-8012-acae92b99ca0.webp') },
    { id: 'm04', name: 'Isla',   gender: 'Female', age: 'Adult',  body: 'Curvy',    region: 'African',   thumb: img('1754549655133-802433c7-e44b-444e-b067-99ed697108de.webp') },
    { id: 'm05', name: 'Nora',   gender: 'Female', age: 'Adult',  body: 'Average',  region: 'Latina',    thumb: img('1754554414042-a1b947b5-e1f7-4b50-a259-2a4fe099e7db.webp') },
    { id: 'm06', name: 'Lena',   gender: 'Female', age: 'Adult',  body: 'Slim',     region: 'Caucasian', thumb: img('1754551378904-6d5793e1-7a22-4f7d-898f-4a9e225f3f7d.webp') },
    { id: 'm07', name: 'Ruby',   gender: 'Female', age: 'Adult',  body: 'Average',  region: 'Asian',     thumb: img('1754550487247-145ec4e1-8cf1-4f95-8f02-040d9f3761d8.webp') },
    { id: 'm08', name: 'Sofia',  gender: 'Female', age: 'Adult',  body: 'Curvy',    region: 'Latina',    thumb: img('1754533396860-affecc2a-4db6-4aca-80ee-0ac01d9c529c.webp') },
    { id: 'm09', name: 'Elise',  gender: 'Female', age: 'Adult',  body: 'Slim',     region: 'Caucasian', thumb: img('1754535509616-0e37d45f-f958-48cc-b8b1-26d00596aed4.webp') },
    { id: 'm10', name: 'Hana',   gender: 'Female', age: 'Adult',  body: 'Slim',     region: 'Asian',     thumb: img('1754534425154-13b18a2a-647e-42ee-b4fc-1550dde1c913.webp') },
    { id: 'm11', name: 'Amara',  gender: 'Female', age: 'Adult',  body: 'Curvy',    region: 'African',   thumb: img('1754554868422-f26ef311-5abe-42ed-adac-b4b3e118f549.webp') },
    { id: 'm12', name: 'Clara',  gender: 'Female', age: 'Adult',  body: 'Average',  region: 'Caucasian', thumb: img('1754535276285-6a3dd43d-28d9-4dcd-ac39-c52a3569b737.webp') },
    { id: 'm13', name: 'Liam',   gender: 'Male',   age: 'Adult',  body: 'Athletic', region: 'Caucasian', thumb: img('1754547889129-581a3bf6-4ec2-4371-b80f-cbdedfe02141.webp') },
    { id: 'm14', name: 'Noah',   gender: 'Male',   age: 'Adult',  body: 'Athletic', region: 'Latino',    thumb: img('1754554584484-d06d9e39-3fd4-4416-9aad-08c758f82258.webp') },
    { id: 'm15', name: 'Kai',    gender: 'Male',   age: 'Adult',  body: 'Average',  region: 'Asian',     thumb: img('1754554508874-76a6c551-da34-4f8b-9085-6811acd0b815.webp') },
    { id: 'm16', name: 'Ethan',  gender: 'Male',   age: 'Adult',  body: 'Average',  region: 'Caucasian', thumb: img('1754549691979-fe0521b8-7057-42ba-b718-db4b971f5173.webp') },
    { id: 'm17', name: 'Jonah',  gender: 'Male',   age: 'Adult',  body: 'Athletic', region: 'African',   thumb: img('1754550898981-2e321acb-f8d1-4e33-8b49-c72214d7a2be.webp') },
    { id: 'm18', name: 'Marco',  gender: 'Male',   age: 'Adult',  body: 'Average',  region: 'Latino',    thumb: img('1754554736593-b36376c7-76f9-40b3-94e1-ad64adec4581.webp') },
    { id: 'm19', name: 'Dean',   gender: 'Male',   age: 'Adult',  body: 'Athletic', region: 'Caucasian', thumb: img('1754548496378-8f7366e2-bba0-4748-aa7d-4d065a07f327.webp') },
    { id: 'm20', name: 'Rio',    gender: 'Male',   age: 'Adult',  body: 'Slim',     region: 'Asian',     thumb: img('1754549269882-e28cd83a-584d-442e-86a6-7da9c58f7141.webp') },
    { id: 'm21', name: 'Lily',   gender: 'Female', age: 'Kid',    body: 'Slim',     region: 'Caucasian', thumb: img('1754551264086-a2852cda-58a0-4d6c-ab2f-c2c38b1778ac.webp') },
    { id: 'm22', name: 'Iris',   gender: 'Female', age: 'Kid',    body: 'Slim',     region: 'Asian',     thumb: img('1754554062402-fc29c803-8383-482e-945c-6dd1357774d1.webp') },
    { id: 'm23', name: 'Poppy',  gender: 'Female', age: 'Kid',    body: 'Slim',     region: 'Latina',    thumb: img('1754533236385-bb0e144d-b6eb-4187-aece-48e69efb86fe.webp') },
    { id: 'm24', name: 'Theo',   gender: 'Male',   age: 'Kid',    body: 'Slim',     region: 'Caucasian', thumb: img('1754550260254-105acda8-6251-4372-b5e2-7574c97c198c.webp') },
    { id: 'm25', name: 'Diane',  gender: 'Female', age: 'Senior', body: 'Average',  region: 'Caucasian', thumb: img('1754554376911-515a0965-2f66-4f0a-9009-d0082b46e21c.webp') },
    { id: 'm26', name: 'Margot', gender: 'Female', age: 'Senior', body: 'Average',  region: 'Asian',     thumb: img('1754548207942-5ac29bbf-298d-4d35-b37e-ae67afe7a67e.webp') }
  ];

  var MODEL_FILTERS = [
    { key: 'gender', label: 'Gender', values: ['Female', 'Male'] },
    { key: 'age',    label: 'Age',    values: ['Kid', 'Adult', 'Senior'] },
    { key: 'body',   label: 'Body',   values: ['Slim', 'Average', 'Athletic', 'Curvy'] },
    { key: 'region', label: 'Region', values: ['Caucasian', 'Asian', 'African', 'Latina', 'Latino'] }
  ];

  /* -------------------------------------------------------------- backgrounds
     Scene swatches render from gradients, so the picker has no external
     dependency and can never show a broken thumbnail. */
  var BACKGROUNDS = [
    { id: 'b01', name: 'Seamless White',   group: 'Studio',   css: 'linear-gradient(160deg,#ffffff,#eceef2 55%,#d9dde4)' },
    { id: 'b02', name: 'Warm Sand',        group: 'Studio',   css: 'linear-gradient(160deg,#f6e7d3,#e6cbab 60%,#d3ae85)' },
    { id: 'b03', name: 'Soft Grey',        group: 'Studio',   css: 'linear-gradient(160deg,#dfe2e7,#b9bec8 60%,#9aa1ad)' },
    { id: 'b04', name: 'Blush Cyclorama',  group: 'Studio',   css: 'linear-gradient(160deg,#fbe4e6,#f2c2cb 60%,#dfa0ae)' },
    { id: 'b05', name: 'Deep Charcoal',    group: 'Studio',   css: 'linear-gradient(160deg,#3b3f46,#22252b 60%,#141619)' },
    { id: 'b06', name: 'Loft Window',      group: 'Indoor',   css: 'linear-gradient(120deg,#f4f1ec 0 38%,#dcd5ca 38% 62%,#c4bbad 62%)' },
    { id: 'b07', name: 'Marble Wall',      group: 'Indoor',   css: 'linear-gradient(135deg,#f7f6f4,#e3e0da 40%,#cfd3d1 70%,#eceae6)' },
    { id: 'b08', name: 'Cafe Interior',    group: 'Indoor',   css: 'linear-gradient(170deg,#e8d5bb,#b98f63 55%,#7a583a)' },
    { id: 'b09', name: 'Boutique Rail',    group: 'Indoor',   css: 'linear-gradient(150deg,#efe6dd,#cdb9a7 55%,#9d8877)' },
    { id: 'b10', name: 'Beach Sunset',     group: 'Outdoor',  css: 'linear-gradient(180deg,#ffd18c 0 46%,#f79e6d 46% 64%,#e0cbb0 64%)' },
    { id: 'b11', name: 'Golden Field',     group: 'Outdoor',  css: 'linear-gradient(180deg,#bfe3f5 0 48%,#e3cf8d 48% 72%,#c7a95f 72%)' },
    { id: 'b12', name: 'Poolside',         group: 'Outdoor',  css: 'linear-gradient(180deg,#cfe9f7 0 42%,#5fc0d9 42% 74%,#2a94b5 74%)' },
    { id: 'b13', name: 'Autumn Park',      group: 'Outdoor',  css: 'linear-gradient(180deg,#e9dfc6 0 40%,#c58a4a 40% 74%,#7a5a33 74%)' },
    { id: 'b14', name: 'City Street',      group: 'Urban',    css: 'linear-gradient(180deg,#c9d3dd 0 52%,#8d97a3 52% 78%,#5c646e 78%)' },
    { id: 'b15', name: 'Neon Night',       group: 'Urban',    css: 'linear-gradient(160deg,#1b1740,#5a2a86 45%,#c93f8e 80%,#ff8a5b)' },
    { id: 'b16', name: 'Brick Alley',      group: 'Urban',    css: 'linear-gradient(150deg,#b9765f,#8d4f3d 55%,#5d3227)' },
    { id: 'b17', name: 'Subway Platform',  group: 'Urban',    css: 'linear-gradient(170deg,#dfe4e8,#9fa8b2 50%,#4d545c)' },
    { id: 'b18', name: 'Mint Gradient',    group: 'Abstract', css: 'linear-gradient(140deg,#d8f5e7,#86d9bd 55%,#3fae90)' },
    { id: 'b19', name: 'Lilac Haze',       group: 'Abstract', css: 'linear-gradient(140deg,#ece3ff,#c3a8f2 55%,#8f6fe0)' },
    { id: 'b20', name: 'Sunset Fade',      group: 'Abstract', css: 'linear-gradient(140deg,#ffe3c7,#ff9d7e 50%,#e4586f)' }
  ];

  var BACKGROUND_GROUPS = ['Studio', 'Indoor', 'Outdoor', 'Urban', 'Abstract'];

  /* ---------------------------------------------------------------------- nav */
  var NAV = [
    { id: 'try-on-clothing',    label: 'Try On Clothing',      icon: 'shirt' },
    { id: 'try-on-accessories', label: 'Try On Accessories',   icon: 'gem' },
    { id: 'swap-model-bg',      label: 'Swap Model & BG',      icon: 'swap', active: true },
    { id: 'product-video',      label: 'Product Video',        icon: 'video' },
    { id: 'poses-angles',       label: 'Create Poses & Angles', icon: 'poses' },
    { id: 'product-in-hand',    label: 'Product In Hand',      icon: 'hand' },
    { id: 'tools',              label: 'Tools',                icon: 'tools' },
    { id: 'inspirations',       label: 'Inspirations',         icon: 'sparkle' }
  ];

  global.DATA = {
    CDN_BASE: CDN_BASE,
    CATEGORIES: CATEGORIES,
    GALLERY: GALLERY,
    MODELS: MODELS,
    MODEL_FILTERS: MODEL_FILTERS,
    BACKGROUNDS: BACKGROUNDS,
    BACKGROUND_GROUPS: BACKGROUND_GROUPS,
    NAV: NAV,
    EXAMPLE_UPLOADS: [
      img('1754554667010-10615e82-e58a-4496-8cbc-d72d411e3d0f.webp'),
      img('1754547889129-581a3bf6-4ec2-4371-b80f-cbdedfe02141.webp'),
      img('1754551378904-6d5793e1-7a22-4f7d-898f-4a9e225f3f7d.webp'),
      img('1754551264086-a2852cda-58a0-4d6c-ab2f-c2c38b1778ac.webp'),
      img('1754554736593-b36376c7-76f9-40b3-94e1-ad64adec4581.webp')
    ]
  };
})(window);
