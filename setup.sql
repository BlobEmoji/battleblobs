
COPY locales (id) FROM stdin;
en
ja
fr
\.

COPY blobrarity (id, name, rarity_scalar) FROM stdin;
1	rarity.legendary	100
2	rarity.rare	50
3	rarity.uncommon	30
4	rarity.common	10
\.

COPY stattypes (id, stat_name) FROM stdin;
1	health
2	attack
3	defense
4	speed
5	level
6	None
\.

COPY statusdefs (id, name, addition_text, status_text, effect_text, removal_text, volatile, damage_per_turn, skip_chance, min_turns, max_turns, symbol, priority) FROM stdin;
1	None	null	null	null	null	TRUE	0	0	0	0	null	0
2	Burn	has been burned.	null	is hurt by its burn!	has recovered from its burn!	FALSE	0.0625	0	3	7	BRN	1
3	Asleep	has fallen asleep.	is fast asleep!	null	woke up!	FALSE	0	1	2	5	SLP	2
4	Confusion	is now confused.	is confused.	has hurt itself in confusion!	has snapped out of it!	TRUE	0.1	0.33	2	6	null	3
5	Infatuated	is now infatuated.	is infatuated.	cannot attack!	has snapped out of it!	TRUE	0	0.5	2	5	null	4
6	Can't Escape	cant escape!	null	can't escape!	is now free.	TRUE	0	0	10	10	null	-1
7	Frozen	is now frozen.	is frozen.	can't move!	has thawed out!	FALSE	0	1	2	5	FRZ	2
8	Paralyzed	is now paralyzed.	is paralyzed.	can't move!	has recovered from paralysis!	FALSE	0	0.5	2	5	PAR	4
9	Transformed	has now transformed into the enemy blob.	null	null	has transformed back into itself.	TRUE	0	0	5	5	null	1
\.
    
COPY blobmoves (id, move_name, damage, accuracy, max_pp, stat_type1, stat_boost1, stat_type2, stat_boost2, enemy_stat_type1, enemy_stat_debuff1, enemy_stat_type2, enemy_stat_debuff2, recoil, status_effect, status_chance, self_status, additional_effect, description, original_move) FROM stdin;
1	Squash	100	0.7	15	4	-2	6	0	6	0	6	0	0.2	1	0	FALSE	None	.	FALSE
2	Roll	70	0.9	15	4	1	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
3	Peek	0	1	30	3	2	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
4	Bounce	90	0.75	30	4	1	6	0	6	0	6	0	0.1	1	0	FALSE	None	.	FALSE
5	Wobble	0	1	20	2	2	4	2	6	0	6	0	0	1	0	FALSE	None	.	FALSE
6	Blush	0	1	30	6	0	6	0	2	2	3	2	0	1	0	FALSE	None	.	FALSE
7	Melt	0	1	20	3	2	4	-3	6	0	6	0	0	1	0	FALSE	None	.	FALSE
8	Dance 	0	1	20	2	2	4	2	6	0	6	0	0	1	0	FALSE	None	.	FALSE
9	Think	0	1	20	2	2	3	2	6	0	6	0	0	1	0	FALSE	None	.	FALSE
10	Nom	80	1	25	6	0	6	0	6	0	6	0	0	1	0	FALSE	Leech	.	FALSE
11	Glare	0	1	20	6	0	6	0	3	2	4	2	0	1	0	FALSE	None	.	FALSE
12	Party	0	1	20	2	2	4	2	6	0	6	0	0	1	0	FALSE	None	.	FALSE
13	Sweat	0	1	30	2	1	4	1	6	0	6	0	0	1	0	FALSE	None	.	FALSE
14	Pats	50	1	30	6	0	6	0	3	2	6	0	0	1	0	FALSE	None	.	FALSE
15	Hammer	120	0.8	5	6	0	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
16	Sing	0	1	5	6	0	6	0	6	0	6	0	0	3	1	FALSE	None	.	FALSE
17	Slash	90	0.9	25	6	0	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
18	Launch	100	0.7	5	6	0	6	0	6	0	6	0	0.3	1	0	FALSE	None	.	FALSE
19	Splosion	200	1	5	6	0	6	0	6	0	6	0	1	1	0	FALSE	None	.	FALSE
20	Angery	0	1	15	2	3	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
21	Kiss	0	1	15	6	0	6	0	2	2	3	2	0	5	0.5	FALSE	None	.	FALSE
22	Swing	85	1	20	6	0	6	0	6	0	6	0	0	1	0	FALSE	None	.	FALSE
23	Torch	40	0.8	25	6	0	6	0	6	0	6	0	0	3	0.5	FALSE	None	.	FALSE
24	Mail	0	1	30	6	0	6	0	6	0	6	0	0	1	0	FALSE	Swap	.	TRUE
25	Hyper Think	0	1	20	2	3	4	1	6	0	6	0	0	1	0	FALSE	None	.	FALSE
26	Flame Roll	80	0.7	25	6	0	6	0	6	0	6	0	0	3	0.8	FALSE	None	.	TRUE
27	Popcorn	0	1	15	6	0	6	0	6	0	6	0	-0.2	1	0	FALSE	None	.	FALSE
28	Deny	0	1	15	6	0	6	0	6	0	6	0	0	6	1	FALSE	None	.	FALSE
29	Blizzard	30	1	5	6	0	6	0	6	0	6	0	0	7	0.8	FALSE	None	.	TRUE
30	Lick	40	0.6	20	6	0	6	0	6	0	6	0	0	8	0.6	FALSE	None	.	FALSE
31	Yawn	0	0.5	10	6	0	6	0	6	0	6	0	0	3	1	FALSE	None	.	FALSE
32	Rest	0	1	5	6	0	6	0	6	0	6	0	-1	3	1	TRUE	None	.	FALSE
33	Wob	0	0.7	15	6	0	6	0	3	2	6	0	0	5	0.6	FALSE	None	.	TRUE
34	Sob	0	1	15	4	-1	6	0	3	3	6	0	0	1	0	FALSE	None	.	FALSE
35	Thunderbolt	80	0.8	15	6	0	6	0	6	0	6	0	0	8	0.7	FALSE	None	.	TRUE
36	Sips	0	1	15	4	1	6	0	6	0	6	0	-0.2	1	0	FALSE	None	.	FALSE
37	Transform	0	1	5	6	0	6	0	6	0	6	0	0	9	1	TRUE	None	.	TRUE
38	Cast	100	0.9	10	6	0	6	0	2	1	3	1	0	1	0	FALSE	None	.	TRUE
39	Portal	0	1	15	4	3	6	0	6	0	6	0	0	1	0	FALSE	None	.	TRUE
40	Blind	0	1	15	6	0	6	0	4	3	6	0	0	1	0	FALSE	None	.	TRUE
41	Perform	0	1	5	2	3	4	2	6	0	6	0	0	1	0	FALSE	None	.	TRUE
42	Bolb Smash	130	0.8	10	2	2	3	2	6	0	6	0	0	6	0.7	TRUE	None	.	TRUE
43	Heart Beam	60	0.7	10	6	0	6	0	6	0	6	0	0	5	0.5	FALSE	None	.	TRUE
44	B4n	140	0.8	5	2	-3	6	0	6	0	6	0	0	1	0	FALSE	None	.	TRUE
\.

COPY blobdefs (id, emoji_id, emoji_name, default_move_id, rarity) FROM stdin;
1	396521772691881987	blobblush	6	1
2	396521772771442689	blobhyperthink	25	1
3	396521772838682626	athinkingwithblobs	39	1
4	396521772842745857	wolfiriblob	0	1
5	396521772855590916	blobnomcookie	10	1
6	396521772868042754	feelsblobman	0	1
7	396521772905922562	b4nzyblob	15	1
8	396521772968837121	blobwavereverse	0	1
9	396521773115637780	blobkissheart	21	1
10	396521773115637783	blobsob	34	1
11	396521773115637810	b1nzyblob	44	1
12	396521773144866826	blobsad	34	1
13	396521773149192214	blobnom	10	1
14	396521773207912468	redtick	0	1
15	396521773216301056	blobwave	0	1
16	396521773245530123	greentick	0	1
17	396521773266632715	ablobreachreverse	0	1
18	396521773325090817	thinkingwithblobs	39	1
19	548314764548505631	ablobsalute	0	1
20	396521773602045955	ablobmelt	7	1
21	396521773622886403	ablobthinkingfast	9	1
22	396521773702578177	ablobuwu	6	1
23	548314784471449610	ablobsweats	13	1
24	555919412885061694	blobthinkingdown	9	1
25	396521773727875072	ablobreach	0	1
26	542514991643754506	blobpats	14	1
27	396521774147436554	ablobnom	10	1
28	552927506957729802	ablobwave	0	1
29	552927522824781834	ablobwavereverse	0	1
30	399742793976643585	ablobcheer	0	1
31	542515828197687296	ablobbounce	4	1
32	400876670023892994	ablobkiss	21	1
33	400876670350786564	ablobcry	34	1
34	400876670703239180	ablobhearteyes	43	1
35	401259054254522369	ablobrollbounce	2	1
36	543967292409511956	ablobglarezoombutfast	11	1
37	414286078346788864	ablobglarezoom	11	1
38	414287546638532608	ablobpopcorn	27	1
39	542514998396846092	ablobpats	14	1
40	434508197995347979	ablobhammer	15	1
41	542514993896226816	ablobsadpats	14	1
42	552205361457922048	blobmelt	7	1
43	453933115413495808	blobreachreverse	0	1
44	453933115765817377	blobreach	0	1
45	453933426555486208	bolb	42	1
46	457293719000055808	ablobjoy	0	1
47	466609019050524673	blobheart	43	1
48	468995798512959508	ablobthinking	9	1
49	469004978045059082	acongablob	12	1
50	548314796089671681	apartyblob	12	1
51	469327589643780096	ablobnwn	0	1
52	475572626803261440	blob0w0	0	1
53	480560277348417547	abloblurk	0	1
54	480560279743102976	ablobsquish	0	1
55	539863905221083137	blobthinkingglare	11	1
56	492363770841006087	b1nzyblob2	44	1
57	492776674262515733	ab1nzyblob2	44	1
58	492776678742032395	ablobattention	0	1
59	493847827118555146	ablobattentionreverse	0	1
60	493854016778797076	ablobpeek	3	1
61	493931884087214081	blobaww	0	1
62	494901549772832785	blobcheer	0	1
63	494901577157574667	blobglare	11	1
64	552205347956457474	bloblul	0	1
65	494901631960219668	blobowo	0	1
66	494901645180928030	blobowoevil	0	1
67	494901658950565893	blobpeek	0	1
68	494901672565538850	blobpopcorn	27	1
69	494901713485037569	blobsalute	0	1
70	494901740123193345	blobshrug	0	1
71	543967270934806533	blobsnuggle	0	1
72	494901771668553732	blobsweats	13	1
73	494901804476137482	blobthumbsup	0	1
74	494901844406042637	blobuwu	6	1
75	494901886609129475	notlikeblob	0	1
76	496445351813840936	awolfiriblob	0	1
77	548314749293559859	ablobhype	0	1
78	497761867834589185	ablobzerogravity	0	1
79	504966841064620033	ablobthinkzerogravity	9	1
80	506956736113147909	ablobpanic	0	1
81	508506669735739392	amegablobsweats	13	1
82	525374551635525634	ablobaww	0	1
83	527180079630123008	blobthinking	9	1
84	543967326219927552	ablobowo	0	1
85	542514991283044363	blobsadpats	14	1
86	530277868421513238	aphotoblob	0	1
87	530278197305278495	blobpolice	0	1
88	530901399077388289	blob	0	1
89	531883492246552588	photoblob	0	1
90	538636735672877066	blobhammer	15	1
91	396521731126460427	blobhug	0	1
92	396521731176529931	blobhearteyes	43	1
93	396521731185180684	blobsmirk	0	1
94	396521731247833091	blobfearful	0	1
95	396521731264872453	blobcheerful2	0	1
96	396521731285712897	blobpanic	0	1
97	396521731285712898	blobunamused	0	1
98	396521731298426891	blobbowing	0	1
99	396521731319267333	blobcry	0	1
100	396521731331850241	blobsmilehappyeyes	0	1
101	396521731336175617	blobsleeping	31	1
102	396521731373793281	blobcool	0	1
103	396521731428319233	blobtongue	30	1
104	396521731432382474	blobangry	20	1
105	396521731440771085	blobsmile	0	1
106	396521731466199051	blobupset	0	1
107	396521731507879936	blobjoy	0	1
108	396521731516399626	blobcheeky	0	1
109	396521731529113600	blobfrowningbig	34	1
110	396521731537240074	blobfrowning	34	1
111	396521731537502208	blobfrown	34	1
112	396521731562668032	blobpensive	34	1
113	396521731575250944	blobopenmouth	0	1
114	396521731587833857	blobnervous	0	1
115	396521731612999692	blobyum	0	1
116	396521731616931850	blobcheerful	0	1
117	396521731617062912	blobrofl	0	1
118	556124183797563403	blobtriumph	0	1
119	396521731625582592	blobok	0	1
120	396521731629645834	blobtired	31	1
121	396521731633709067	blobsmiley	0	1
122	396521731658874891	blobwink	0	1
123	396521731663069191	blobweary	0	1
124	396521731663200256	blobupsidedown	0	1
125	396521731679977482	blobsmilesweat2	13	1
126	396521731684040704	blobugh	0	1
127	396521732086693888	blobangel	0	1
128	396521732233494528	blobtonguewink	30	1
129	396521732267311104	blobsmilehappy	0	1
130	396521732443471892	blobgrin	0	1
131	548314788145659905	ablobunamused	0	1
132	399744982149496832	ablobdizzy	0	1
133	400876918406381569	ablobsunglasses	0	1
134	400876918569697280	ablobtonguewink	30	1
135	400876918632611840	ablobsleep	31	1
136	400876918670360576	ablobsigh	0	1
137	400876918708371456	ablobwink	0	1
138	400876918779412480	ablobweary	0	1
139	400876919530455040	ablobgrin	0	1
140	400877005282869248	ablobsmile	0	1
141	451803540172570654	blobvomiting	0	1
142	552205329484742704	blobdizzy	0	1
143	552205402264305665	blobxd	0	1
144	459292290549284864	ablobnervous	0	1
145	468993358497579009	ablobangel	0	1
146	468993358891712512	ablobnogood	0	1
147	468993358954627082	ablobrollingeyes	0	1
148	468995755495915527	ablobsweating	13	1
149	475572748488409108	ablobscream	0	1
150	494901623731126272	blobnogood	0	1
151	494901681419452426	blobpray	0	1
152	494901694703075338	blobrollingeyes	0	1
153	494901749476360203	blobsmilesweat	13	1
154	521498148821008385	ablobsmilehappy	0	1
155	526236259111403523	blobneutral	0	1
156	533338329463259136	blobscream	0	1
157	533339510138732559	ablobgrimace	0	1
158	533339510264561674	blobgrimace	0	1
159	396521401366085644	blobconfounded	0	1
160	555940560473423913	blobderpy	0	1
161	396521401466617858	blobangery	20	1
162	555927905494892550	blobkissblush	21	1
163	555940986036027402	blobdrool	31	1
164	396521401651298315	blobbored	0	1
165	555940673078034434	blobawkward	0	1
166	555940896735232013	blobexpressionless	0	1
167	396521401789710347	blobreachsob	34	1
168	555927261354917898	blobthinkingcool	9	1
169	396521401806356482	blobwoah	0	1
170	396521401810419712	blobdead	0	1
171	555940908970016768	blobshh	0	1
172	555927242514104340	blobhyperthinkfast	25	1
173	396521401852624907	blobunsure	0	1
174	555927149195034645	blobfistbumpR	0	1
175	555940968763883525	blobokhand	0	1
176	396521401902694410	blobnauseated	0	1
177	555927137962426396	blobfistbumpL	0	1
178	396521401932054538	blobnomouth	0	1
179	396521401936511004	blobpout2	0	1
180	555926824496922635	blobwhistle	16	1
181	555926809741623336	blobthinkingeyes	9	1
182	396521402045300737	blobsleepless	32	1
183	555926182894370847	blobkiss	21	1
184	400877181884039178	ablobflushed	6	1
185	555926127839805440	blobthumbsdown	0	1
186	555930424942133248	blobeyesdown	0	1
187	555930441971007499	blobeyesup	0	1
188	555930453396160522	ablobeyes	0	1
189	555927582017716245	ablobthinkingeyes	9	1
190	552205338128941073	blobenjoy	0	1
191	555940919203856414	blobsneezing	0	1
192	555925431631478794	blobcouple	21	1
193	555941005321437185	blobfacepalm	0	1
194	453932285461266432	blobflushed	6	1
195	453932930763325450	blobpout	0	1
196	555927478888169475	ablobcouple	21	1
197	555927500790825019	ablobraisehand	0	1
198	552206071993860116	ablobwhee	0	1
199	555941103988375563	ablobheadshake	0	1
200	476711613093904405	blobsurprised	0	1
201	483675983120171008	ablobderpy	0	1
202	484415015349125120	ablobderpyhappy	0	1
203	552970376359968788	ablobblewobble	5	1
204	494901526603628544	blobamused	0	1
205	494901539346055189	blobbandage	0	1
206	494901558975397888	blobderpyhappy	0	1
207	555940942973239307	blobnerd	9	1
208	555926065369972796	blobthinkingfast	9	1
209	555926022688735257	blobthinkingsmirk	9	1
210	494901826206826511	blobtilt	0	1
211	494901876987527178	blobzippermouth	0	1
212	494975218360778773	blobooh	0	1
213	553304354657009680	blobnwn	0	1
214	538637024647839763	blobyikes	0	1
215	498940202098884655	ablobwoahsnow	29	1
216	500040988920643605	ablobwoah	0	1
217	552971023067119617	ablobhydraulicpress	1	1
218	553304913438965768	abongoblob	41	1
219	525375624534163467	ablobdrool	0	1
220	555923115952177152	blobteefs	0	1
221	555940952523407390	blobthonkang	9	1
222	530187714788851722	blob0w0	0	1
223	555940978100404242	blobdoubtful	0	1
224	396521262609858560	blobhighfive	0	1
225	396521262639480832	blobnomchristmas	10	1
226	396521262643412992	blobidea	9	1
227	396521262656258048	blobpin	0	1
228	396521262706589707	blobpopsicle	0	1
229	555927190340894721	blobreachdrool	0	1
230	555926857824862228	blobsadcloud	35	1
231	396521263108980736	ablobshake	0	1
232	397150027748868096	blobparty	12	1
233	399743182054752257	blobhuh	0	1
234	403752429809565703	blobfingerguns	0	1
235	555934433417363456	ablobsadcloud	35	1
236	414285886793056258	blobsip	36	1
237	414286612743061504	blobsplosion	19	1
238	414316315507949568	bloblamp	40	1
239	414316315541766154	abloblamp	40	1
240	417548196152082436	blobonfire	26	1
241	417548642790932492	ablobonfire	26	1
242	555927309899530241	ablobhungry	0	1
243	434507586948169752	ablobmaracas	41	1
244	434510759763116036	blobdancer	5	1
245	442861262360281100	blobthis	0	1
246	555941015207411763	blobgiggle	0	1
247	442861925961826305	blobmindblown	0	1
248	543967261740892201	blobpan	0	1
249	451804475842101258	blobglassesdown	0	1
250	451808457495019530	blobgo	0	1
251	451808592283041792	blobstop	0	1
252	453932598683631618	blobnostar	0	1
253	468995576621432852	ablobtipping	0	1
254	555928529997660162	ablobdancer	5	1
255	469326987677138946	adontfeelsoblob	34	1
256	488758408548450324	blobdisapproval	0	1
257	488758408976269350	blobdoubt	0	1
258	555926153072869392	blobimfine	34	1
259	555926108160393227	blobbroken	0	1
260	491270796115968000	blobpoll	0	1
261	555926045937893388	blobmeltsob	7	1
262	543967248126050326	blobmeltsoblove	7	1
263	494901835686215680	blobtorch	23	1
264	494901854803853312	blobwaitwhat	0	1
265	555928001951563776	blobconfused	0	1
266	495336754698518531	blobcmereyou	0	1
267	518218042925252608	blobmaracas	41	1
268	542515539768246282	blobworried	0	1
269	523751909903958018	ablobguitar	41	1
270	527181264088727583	ablobsplosion	19	1
271	555941023117869059	blobyawn	31	1
272	530185750260744192	blobovercuteness	0	1
273	530187250080940073	blobthinksmart	9	1
274	552205393082712064	blobthump	34	1
275	530187250332598302	blobmoustache	0	1
276	530277550010662912	ablobblastoff	18	1
277	535907963278458881	ablobparty	12	1
278	535908043821547540	blobsobglasses	34	1
279	396514815788449803	blobpatrol	0	1
280	396514815863947266	bloboutage	0	1
281	396514815973130240	bloboro	0	1
282	396514815998427140	nikoblob	0	1
283	396514816019267595	blobross	0	1
284	552930293195997186	doggoblob	30	1
285	396514816082182144	blobninja	0	1
286	396514816107347968	jakeblob	0	1
287	396514816115605524	nellyblob	0	1
288	552930295175970846	reindeerblob	29	1
289	396514816292028416	rainblob	0	1
290	396514816317194240	rickblob	39	1
291	396514816400818176	pusheenblob	30	1
292	396514816522452995	ajakeblob	0	1
293	399748953156878346	arainblob	0	1
294	404670865318608896	ablobgift	0	1
295	434506470847938570	blobnitro	0	1
296	548314745048924166	ablobcolorshift	12	1
297	552930294370664448	pandablob	0	1
298	451808876916899860	blobgift	0	1
299	453933845633302528	kirbyblob	37	1
300	470985876336279562	wumpusblob	0	1
301	483676111776120852	ablobjoin	0	1
302	483676112329637891	ablobleave	0	1
303	491270848032800768	blobmail	24	1
304	491270848452493312	blobpartlysunny	35	1
305	552930293141471249	blobcat	30	1
306	494901722779746304	blobsanta	29	1
307	552930293762490397	blobfrog	0	1
308	507241860230807555	blobwitch	38	1
309	552205374246223892	blobpirate	0	1
310	552928051072335892	blobgoat	30	1
311	519570897234034719	blobwob	33	1
312	519570900165722116	ablobwob	33	1
313	523751706065108994	blobbot	0	1
314	552930293946908673	ferretblob	0	1
315	525460374431072256	blobwizard	38	1
316	527180261063000092	blobgoodnight	0	1
317	552205384639840258	blobspam	0	1
318	530185434555351052	blobthanks	0	1
319	530185434567933963	blobyes	0	1
320	530185434597294103	blobcamera	0	1
321	530185434672660490	blobdetective	0	1
322	530185434697826334	blobcouncil	28	1
323	530185434698088448	blobhero	17	1
324	530185434702282763	blobno	0	1
325	530185434714603540	blobcowboy	0	1
326	530185434714734592	blobhypesquad	0	1
327	530185434807140353	blobspy	0	1
328	530185435238891552	ablobcouncil	28	1
329	552969261891715112	blobpoliceangery	20	1
330	530187887933653002	gentleblob	0	1
331	530277679878897664	blobthief	0	1
332	530278028501057536	pikablob	35	1
333	533337793154252800	blobgoodnightreverse	0	1
334	533337802419601418	blobgoodmorning	0	1
335	533338544333127680	blobdevil	0	1
336	533338552776523786	ablobdevil	0	1
337	548314915253780493	ablobhop	0	1
338	543967239242776586	blobinlove	0	1
339	555923348165623828	bloboverheated	0	1
340	555925997158006844	blobembarrassed	0	1
341	555926770449121281	blobfreezing	0	1
342	555927292547694621	ablobmeltsoblove	0	1
343	555927544646467584	blobsick	0	1
344	543967750389891072	blobpleading	0	1
345	556124250629472287	blobtriumph2	0	1
346	538636521260056587	ablobgoodnightreverse	0	1
347	538636522379804682	ablobgoodnight	0	1
348	538636831202213888	blobgoodmorningreverse	0	1
349	552928107858886684	blobartist	0	1
350	553304368594550784	blobworker	0	1
351	553304571930476594	blobmorning	0	1
352	553304572165357578	blobnight	0	1
353	553304579731619850	blobgamer	0	1
354	553304584593080361	ablobbass	0	1
\.

COPY itemmodes (id) FROM stdin;
1
2
3
4
5
6
\.

COPY itemdefs (id, name, value, battle_use, potential, mode, description, category) FROM stdin;
1	Potion	5	TRUE	20	1	Restores HP of a blob by 20 points.	Medicine
2	Super Potion	10	TRUE	60	1	Restores HP of a blob by 60 points.	Medicine
3	Hyper Potion	20	TRUE	200	1	Restores HP of a blob by 200 points.	Medicine
4	Max Potion	30	TRUE	100	2	Fully restores HP of a blob.	Medicine
5	Revive	15	TRUE	50	3	Revives a fainted blob with half its HP.	Medicine
6	Max Revive	40	TRUE	100	3	Revives a fainted blob with all its HP.	Medicine
7	Burn Heal	10	TRUE	1	4	Heals blob of a burn.	Medicine
8	Awakening	10	TRUE	2	4	Awakens a sleeping blob.	Medicine
9	HP Up	50	FALSE	1	5	Raises the HP of a blob.	Medicine
10	Attack Up	80	FALSE	2	5	Raises the Attack of a blob.	Medicine
11	Defense Up	60	FALSE	3	5	Raises the Defense of a blob.	Medicine
12	Speed Up	50	FALSE	4	5	Raises the Speed of a blob.	Medicine
13	Rare Candy	100	FALSE	5	5	Raises the level of a blob by one.	Medicine
14	TM 1: Squash	0	FALSE	1	6	Teach a blob the move: Squash	TM
15	TM 2: Roll	0	FALSE	2	6	Teach a blob the move: Roll	TM
16	TM 3: Peek	0	FALSE	3	6	Teach a blob the move: Peek	TM
17	TM 4: Bounce	0	FALSE	4	6	Teach a blob the move: Bounce	TM
18	TM 5: Wobble	0	FALSE	5	6	Teach a blob the move: Wobble	TM
19	TM 6: Blush	0	FALSE	6	6	Teach a blob the move: Blush	TM
20	TM 7: Melt	0	FALSE	7	6	Teach a blob the move: Melt	TM
21	TM 8: Dance 	0	FALSE	8	6	Teach a blob the move: Dance 	TM
22	TM 9: Think	0	FALSE	9	6	Teach a blob the move: Think	TM
23	TM 10: Nom	0	FALSE	10	6	Teach a blob the move: Nom	TM
24	TM 11: Glare	0	FALSE	11	6	Teach a blob the move: Glare	TM
25	TM 12: Party	0	FALSE	12	6	Teach a blob the move: Party	TM
26	TM 13: Sweat	0	FALSE	13	6	Teach a blob the move: Sweat	TM
27	TM 14: Pats	0	FALSE	14	6	Teach a blob the move: Pats	TM
28	TM 15: Hammer	0	FALSE	15	6	Teach a blob the move: Hammer	TM
29	TM 16: Sing	0	FALSE	16	6	Teach a blob the move: Sing	TM
30	TM 17: Slash	0	FALSE	17	6	Teach a blob the move: Slash	TM
31	TM 18: Launch	0	FALSE	18	6	Teach a blob the move: Launch	TM
32	TM 19: Splosion	0	FALSE	19	6	Teach a blob the move: Splosion	TM
33	TM 20: Angery	0	FALSE	20	6	Teach a blob the move: Angery	TM
34	TM 21: Kiss	0	FALSE	21	6	Teach a blob the move: Kiss	TM
35	TM 22: Swing	0	FALSE	22	6	Teach a blob the move: Swing	TM
36	TM 23: Torch	0	FALSE	23	6	Teach a blob the move: Torch	TM
37	TM 24: Mail	0	FALSE	24	6	Teach a blob the move: Mail	TM
38	TM 25: Hyper Think	0	FALSE	25	6	Teach a blob the move: Hyper Think	TM
39	TM 26: Flame Roll	0	FALSE	26	6	Teach a blob the move: Flame Roll	TM
40	TM 27: Popcorn	0	FALSE	27	6	Teach a blob the move: Popcorn	TM
41	TM 28: Deny	0	FALSE	28	6	Teach a blob the move: Deny	TM
42	TM 29: Blizzard	0	FALSE	29	6	Teach a blob the move: Blizzard	TM
43	TM 30: Lick	0	FALSE	30	6	Teach a blob the move: Lick	TM
44	TM 31: Yawn	0	FALSE	31	6	Teach a blob the move: Yawn	TM
45	TM 32: Rest	0	FALSE	32	6	Teach a blob the move: Rest	TM
46	TM 33: Wob	0	FALSE	33	6	Teach a blob the move: Wob	TM
47	TM 34: Sob	0	FALSE	34	6	Teach a blob the move: Sob	TM
48	TM 35: Thunderbolt	0	FALSE	35	6	Teach a blob the move: Thunderbolt	TM
49	TM 36: Sips	0	FALSE	36	6	Teach a blob the move: Sips	TM
50	TM 37: Transform	0	FALSE	37	6	Teach a blob the move: Transform	TM
51	TM 38: Cast	0	FALSE	38	6	Teach a blob the move: Cast	TM
52	TM 39: Portal	0	FALSE	39	6	Teach a blob the move: Portal	TM
53	TM 40: Blind	0	FALSE	40	6	Teach a blob the move: Blind	TM
54	TM 41: Perform	0	FALSE	41	6	Teach a blob the move: Perform	TM
55	TM 42: Bolb Smash	0	FALSE	42	6	Teach a blob the move: Bolb Smash	TM
56	TM 43: Heart Beam	0	FALSE	43	6	Teach a blob the move: Heart Beam	TM
57	TM 44: B4n	0	FALSE	44	6	Teach a blob the move: B4n	TM
\.

COPY effecttypes (id) FROM stdin;
1
\.

COPY effectdefs (id, name, potential, type) FROM stdin;
1	effect.blob_lure.name	0	1
\.


